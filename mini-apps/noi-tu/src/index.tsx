import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { checkWord, dictionaryReady, lastSyllable, loadDictionary, noiTuGame, syllables, type NoiTuParty, type NoiTuState } from './game';
import { strings, type CheckMode, type Seconds } from './strings';
import s from './NoiTu.module.css';
import iconSvg from '../icon.svg?raw';

const secondsOptions = (Object.keys(strings.secondsOptions) as Seconds[]).map((v) => ({ value: v, label: strings.secondsOptions[v] }));
const checkOptions = (Object.keys(strings.checkOptions) as CheckMode[]).map((v) => ({ value: v, label: strings.checkOptions[v] }));

function NoiTuSettings({ value, onChange, editable }: SettingsProps<NoiTuState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.secondsLabel} options={secondsOptions} value={value.seconds ?? '15'} onChange={(seconds) => onChange({ seconds })} disabled={!editable} />
      <Chips label={strings.checkLabel} options={checkOptions} value={value.check ?? 'vote'} onChange={(check) => onChange({ check })} disabled={!editable} />
    </SettingsCard>
  );
}

/** Nạp từ điển (file riêng, tải lazy) một lần cho cả máy. */
function useDictionary() {
  const [ready, setReady] = useState(dictionaryReady);
  useEffect(() => {
    if (ready) return;
    let live = true;
    void import('./words').then((m) => {
      loadDictionary(m.WORDS);
      if (live) setReady(true);
    });
    return () => {
      live = false;
    };
  }, [ready]);
  return ready;
}

/** Số mili giây còn lại của lượt, cập nhật liên tục theo giờ phòng. */
function useRemaining(deadline: number, paused: boolean, now: () => number) {
  const [left, setLeft] = useState(() => (deadline ? Math.max(0, deadline - now()) : 0));
  useEffect(() => {
    if (!deadline || paused) return;
    const tick = () => setLeft(Math.max(0, deadline - now()));
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [deadline, paused, now]);
  return deadline ? left : 0;
}

const RING_R = 34;
const RING_C = 2 * Math.PI * RING_R;

const errorText =(reason: 'syllables' | 'link' | 'used' | 'unknown', need: string | null) =>
  reason === 'syllables' ? strings.errSyllables : reason === 'link' ? strings.errLink(need ?? '') : reason === 'used' ? strings.errUsed : strings.errUnknown;

function Seats({ party }: { party: NoiTuParty }) {
  const st = party.state!;
  return (
    <ul className={s.seats}>
      {st.seats.map((id, i) => (
        <li key={id} className={cx(s.seat, !st.done && !st.vote && st.turn === i && s.seatOn, !st.alive[i] && s.seatOut, st.winner === i && s.seatWin)}>
          <Avatar name={party.nameOf(id) || '?'} dim={!st.alive[i]} />
          <span className={s.seatName}>{party.nameOf(id)}</span>
          {(st.wins[id] ?? 0) > 0 && <span className={s.seatWins} title={strings.wins}>{st.wins[id]}</span>}
        </li>
      ))}
    </ul>
  );
}

function Chain({ st }: { st: NoiTuState }) {
  const end = useRef<HTMLLIElement>(null);
  useEffect(() => end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), [st.chain.length]);
  if (!st.chain.length) return <p className={s.chainEmpty}>{strings.chainEmpty}</p>;
  return (
    <ol className={s.chain} aria-label={strings.chainCount(st.chain.length)}>
      {st.chain.map((l, i) => {
        const [a, b] = l.word.split(' ');
        const last = i === st.chain.length - 1;
        return (
          <li key={i} ref={last ? end : undefined} className={cx(s.link, last && s.linkLast)}>
            <span>{a}</span> <span className={last ? s.tail : undefined}>{b}</span>
          </li>
        );
      })}
    </ol>
  );
}

function VotePanel({ party }: { party: NoiTuParty }) {
  const st = party.state!;
  const v = st.vote!;
  const local = party.mode === 'local';
  const voter = local ? st.seats[st.turn] : party.me;
  const canVote = v.voters.includes(voter) && !(voter in v.votes);
  const waiting = v.voters.filter((id) => !(id in v.votes)).length;
  return (
    <section className={s.vote} aria-live="polite">
      <p className={s.voteTitle}>{strings.voteTitle(party.nameOf(st.seats[v.seat]), v.word)}</p>
      <p className={s.voteAsk}>{local && canVote ? strings.voteYourTurn(party.nameOf(voter)) : strings.voteAsk}</p>
      {canVote ? (
        <div className={s.voteRow}>
          <Button variant="primary" onClick={() => party.dispatch({ type: 'vote', accept: true })}>{strings.accept}</Button>
          <Button onClick={() => party.dispatch({ type: 'vote', accept: false })}>{strings.reject}</Button>
        </div>
      ) : (
        <p className={s.hintText}>{voter in v.votes ? strings.voted : strings.voteWait(waiting)}</p>
      )}
    </section>
  );
}

function WordInput({ party, ready }: { party: NoiTuParty; ready: boolean }) {
  const st = party.state!;
  const need = lastSyllable(st);
  const seat = st.turn;
  const myId = st.seats[seat];
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    input.current?.focus({ preventScroll: true });
  }, []);
  // Gợi ý tới: điền sẵn vào ô.
  const hint = st.hint && st.hint.seat === seat ? st.hint : null;
  useEffect(() => {
    if (!hint?.word) return;
    const [, b] = hint.word.split(' ');
    setText(need ? b : hint.word);
    setError('');
    input.current?.focus({ preventScroll: true });
  }, [hint?.n, hint?.word, need]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let word = text.trim();
    // Gõ cả hai tiếng (kể cả tiếng đầu) cũng được.
    if (need && !(syllables(word).length === 2 && syllables(word)[0] === need)) word = `${need} ${word}`;
    const r = checkWord(st, word);
    if (!r.ok) {
      if (r.reason === 'unknown' && !ready) setError(strings.loadingDict);
      else setError(errorText(r.reason, need));
      party.sfx('buzz');
      vibrate(60);
      // Gõ sai liên tiếp vẫn rung lại (class lỗi giữ nguyên nên CSS không tự chạy lại).
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        row.current?.animate({ transform: ['translateX(0)', 'translateX(-6px)', 'translateX(6px)', 'translateX(-3px)', 'translateX(0)'] }, 320);
      }
      return;
    }
    setError('');
    setText('');
    party.dispatch({ type: 'say', word: r.word });
  };

  const hintsLeft = st.hints[myId] ?? 0;
  return (
    <form className={s.form} onSubmit={submit}>
      <div ref={row} className={cx(s.inputRow, error && s.inputBad)}>
        {need && <span className={s.prefix}>{need}</span>}
        <input
          ref={input}
          className={s.input}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
          lang="vi"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="send"
          maxLength={30}
          placeholder={need ? strings.placeholderNext : strings.placeholderFirst}
          aria-label={strings.inputLabel}
          aria-invalid={!!error}
        />
        <Button type="submit" variant="primary" disabled={!text.trim()}>{strings.send}</Button>
      </div>
      <div className={s.formFoot}>
        <span className={s.error} role="alert">{error || (hint && !hint.word ? strings.hintNone : '')}</span>
        <button type="button" className={s.hintBtn} disabled={!ready || hintsLeft <= 0} onClick={() => party.dispatch({ type: 'hint' })}>
          {strings.hint(hintsLeft)}
        </button>
      </div>
    </form>
  );
}

function eventText(party: NoiTuParty) {
  const st = party.state!;
  const e = st.event;
  if (!e) return '';
  if (e.kind === 'out') return strings.evOut(party.nameOf(st.seats[e.seat]));
  return e.kind === 'accepted' ? strings.evAccepted(e.word) : strings.evRejected(e.word);
}

function NoiTuGame({ party }: { party: NoiTuParty }) {
  const st = party.state!;
  const ready = useDictionary();
  const local = party.mode === 'local';
  const mySeat = local ? st.turn : st.seats.indexOf(party.me);
  const myTurn = !st.done && !st.vote && mySeat >= 0 && mySeat === st.turn && st.alive[mySeat];
  const left = useRemaining(st.deadline, !!st.vote || st.done, party.now);
  const total = Number(st.seconds) * 1000;
  const secs = Math.ceil(left / 1000);
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const dispatch = party.dispatch;

  // Hết giờ: gửi báo hết giờ (reducer tự kiểm tra theo giờ phòng, gửi trùng cũng không sao).
  const sent = useRef(0);
  useEffect(() => {
    if (st.done || st.vote || !st.deadline || left > 0 || sent.current === st.deadline) return;
    const id = setTimeout(() => {
      sent.current = st.deadline;
      dispatch({ type: 'timeout' });
    }, 250);
    return () => clearTimeout(id);
  }, [left, st.deadline, st.done, st.vote, dispatch]);

  useEffect(() => {
    if (myTurn && secs > 0 && secs <= 3 && !st.vote) {
      sfx.current('tick');
      vibrate(15);
    }
  }, [secs, myTurn, st.vote]);
  useEffect(() => {
    if (st.chain.length) sfx.current('tap');
  }, [st.chain.length]);
  useEffect(() => {
    if (!st.event) return;
    if (st.event.kind === 'out' || st.event.kind === 'rejected') {
      sfx.current('buzz');
      vibrate([40, 40, 40]);
    }
  }, [st.event]);
  useEffect(() => {
    if (st.done) sfx.current('win');
  }, [st.done]);
  useEffect(() => {
    if (myTurn && !local) vibrate([20, 40, 20]);
  }, [myTurn, local]);

  const turnName = party.nameOf(st.seats[st.turn]);
  const status = st.done
    ? st.winner !== null
      ? strings.won(party.nameOf(st.seats[st.winner]))
      : ''
    : st.vote
      ? ''
      : mySeat < 0
        ? strings.watching
        : !st.alive[mySeat] && !local
          ? strings.out
          : myTurn
            ? st.chain.length
              ? strings.yourMove
              : strings.firstWord
            : strings.waitMove(turnName);

  return (
    <div className={s.game}>
      <Seats party={party} />

      {!st.done && !st.vote && (
        <div className={cx(s.timer, secs <= 3 && s.timerLow)} role="timer" aria-label={`${secs}`}>
          <svg className={s.timerRing} viewBox="0 0 76 76" aria-hidden="true">
            <circle className={s.timerTrack} cx="38" cy="38" r={RING_R} />
            <circle
              className={s.timerArc}
              cx="38"
              cy="38"
              r={RING_R}
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C * (1 - (total ? Math.min(1, left / total) : 0))}
            />
          </svg>
          <span className={s.timerNum}>{strings.seconds(secs)}</span>
        </div>
      )}

      <div className={s.chainWrap}>
        <Chain st={st} />
      </div>

      {st.event && <p className={s.event} key={st.event.n}>{eventText(party)}</p>}
      {status && <p key={status} className={cx(s.status, st.done && s.statusWin)} aria-live="polite">{status}</p>}

      {st.vote ? (
        <VotePanel party={party} />
      ) : myTurn ? (
        <WordInput key={`${st.chain.length}-${st.turn}-${st.event?.n ?? 0}`} party={party} ready={ready} />
      ) : null}

      {st.done &&
        (party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.hintText}>{strings.waitNewGame}</p>
        ))}
    </div>
  );
}

export default function NoiTu({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(noiTuGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <NoiTuSettings {...p} />,
      }}
    >
      {party.state && <NoiTuGame party={party} />}
    </PartyShell>
  );
}

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, ResultCard, partyStyles, useParty, vibrate, type Party, type PartyData } from '@bang/party';
import { Button, Icon, Sheet, cx, keyColors } from '@bang/ui';
import { cardsLeft, fishGame, isRed, leaders, type Card, type FishAction, type FishState, type Spin } from './game';
import { strings, type Finale, type Penalty, type PunishMode } from './strings';
import s from './Fish.module.css';

type FishParty = Party<FishState, FishAction>;

const modeOptions = (Object.keys(strings.modes) as PunishMode[]).map((v) => ({ value: v, label: strings.modes[v] }));
const penaltyOptions = (['on', 'off'] as const).map((v) => ({ value: v, label: strings.penaltyOptions[v] }));
const finaleOptions = (Object.keys(strings.finaleOptions) as Finale[]).map((v) => ({ value: v, label: strings.finaleOptions[v] }));

/** Chờ một nhịp cho cả bàn nhìn bài trước khi hiện vòng phạt / thẻ kết quả. */
const LOOK_MS = 900;

function CardFace({ card }: { card: Card }) {
  return (
    <span className={cx(s.faceUp, isRed(card) && s.red)}>
      <span className={s.rank}>{strings.ranks[card.r]}</span>
      <span className={s.suit}>{strings.suits[card.s]}</span>
    </span>
  );
}

export function FishArt() {
  return (
    <div className={s.art}>
      <span className={cx(s.artCard, s.artBack)} />
      <span className={cx(s.artCard, s.artA)}>
        <CardFace card={{ r: 6, s: 2 }} />
      </span>
      <span className={cx(s.artCard, s.artB)}>
        <CardFace card={{ r: 6, s: 0 }} />
      </span>
    </div>
  );
}

/* ---------- Vòng quay (phạt khi lật trượt và phạt cuối ván) ---------- */

const R = 140;
const SPIN_MS = 3200;
const tones = [
  { fill: 'var(--accent)', text: 'var(--on-accent)' },
  { fill: keyColors.yellow.fill, text: keyColors.yellow.text },
  { fill: keyColors.blue.fill, text: keyColors.blue.text },
];
const point = (deg: number) => {
  const a = (deg * Math.PI) / 180;
  return `${(R * Math.sin(a)).toFixed(2)} ${(-R * Math.cos(a)).toFixed(2)}`;
};
function targetFor(prev: number, spin: Spin, slice: number) {
  const center = spin.slice * slice + slice / 2 + spin.offset;
  const want = (((360 - center) % 360) + 360) % 360;
  return prev + spin.turns * 360 + ((((want - (prev % 360)) % 360) + 360) % 360);
}

interface WheelProps {
  party: FishParty;
  slices: readonly Penalty[];
  onRevealed: (id: number) => void;
}

function SpinWheel({ party, slices, onRevealed }: WheelProps) {
  const slice = 360 / slices.length;
  const spin = party.state!.spin;
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  // Mở ra lần nào cũng đứng yên; chỉ quay khi có lần quay mới.
  const run = useRef({ id: spin?.id ?? 0, to: 0 });
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  const spinId = spin?.id ?? 0;

  useEffect(() => {
    const sp = spinRef.current;
    if (!sp || sp.id === run.current.id) return;
    const ms = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 600 : SPIN_MS;
    const from = run.current.to;
    const to = targetFor(from, sp, slice);
    run.current = { id: sp.id, to };
    setRotation(to);
    setSpinning(true);
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let k = 1; k * slice < to - from && k < 60; k++) {
      timers.push(setTimeout(() => sfxRef.current('tick'), (1 - Math.cbrt(1 - (k * slice) / (to - from))) * ms));
    }
    timers.push(
      setTimeout(() => {
        setSpinning(false);
        onRevealed(sp.id);
      }, ms + 80),
    );
    return () => timers.forEach(clearTimeout);
  }, [spinId, onRevealed, slice]);

  const canSpin = party.myTurn && !party.state!.result && !spinning;
  return (
    <>
      <div className={s.wheelBox}>
        <span className={s.pointer} aria-hidden="true" />
        <svg
          viewBox="-150 -150 300 300"
          className={s.wheel}
          style={{ '--rot': `${rotation}deg`, '--spin-ms': `${SPIN_MS}ms` } as CSSProperties}
          aria-hidden="true"
        >
          {slices.map((b, i) => {
            // Ô được miễn tô đen, khác hẳn các ô phạt, nhìn là biết ô "thoát".
            const tone = b.safe ? { fill: 'var(--ink)', text: 'var(--bg)' } : tones[i % tones.length];
            const center = i * slice + slice / 2;
            const flip = center > 180;
            return (
              <g key={i}>
                <path d={`M0 0 L${point(i * slice)} A${R} ${R} 0 0 1 ${point((i + 1) * slice)} Z`} style={{ fill: tone.fill }} />
                <text
                  x={flip ? -R * 0.58 : R * 0.58}
                  y={0}
                  transform={`rotate(${flip ? center + 90 : center - 90})`}
                  className={s.wheelLabel}
                  style={{ fill: tone.text }}
                >
                  {b.short}
                </text>
              </g>
            );
          })}
          <circle r={R} className={s.rim} />
          <circle r={20} className={s.hub} />
        </svg>
      </div>
      <Button variant="primary" block disabled={!canSpin} onClick={() => party.dispatch({ type: 'spin' })}>
        {spinning ? strings.spinning : party.myTurn ? strings.spin : strings.waitSpin(party.current?.name ?? '')}
      </Button>
    </>
  );
}

/* ---------- Bốc thăm ---------- */

function Lots({ party }: { party: FishParty }) {
  const punish = party.state!.punish!;
  const picked = punish.picked;
  const can = party.myTurn && picked === null && !party.state!.result;
  return (
    <>
      <p className={s.panelHint}>{party.myTurn ? strings.pickLot : strings.waitLot(party.current?.name ?? '')}</p>
      <div className={s.lots}>
        {punish.lots.map((penalty, i) => {
          const open = picked === i;
          return (
            <button
              key={`${punish.order[0]}-${i}`}
              className={cx(s.lot, open && s.lotOpen, picked !== null && !open && s.lotDim)}
              disabled={!can}
              onClick={() => party.dispatch({ type: 'lot', index: i })}
              aria-label={strings.lot(i + 1)}
            >
              <span className={s.lotInner}>
                <span className={s.lotBack}>{i + 1}</span>
                {open && <span className={s.lotFace}>{strings.finals[penalty].short}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Điểm ---------- */

function Scores({ party, final }: { party: FishParty; final?: boolean }) {
  const st = party.state!;
  const { ids } = leaders(st, party.players);
  const rows = party.players.map((p) => ({ p, pts: st.scores[p.id] ?? 0 })).sort((a, b) => b.pts - a.pts);
  return (
    <ol className={cx(s.scores, final && s.scoresFinal)} aria-label={strings.scoreboard}>
      {rows.map(({ p, pts }) => (
        <li key={p.id} className={cx(s.score, !final && p.id === party.current?.id && s.scoreTurn, final && ids.includes(p.id) && pts > 0 && s.scoreWin)}>
          <Avatar name={p.name} dim={p.online === false} />
          <span className={s.scoreName}>{p.name}</span>
          <strong className={s.scorePts}>{final ? strings.pointsTotal(pts) : pts}</strong>
        </li>
      ))}
    </ol>
  );
}

function WinnerBanner({ party }: { party: FishParty }) {
  const st = party.state!;
  const { top, ids } = leaders(st, party.players);
  const names = party.players.filter((p) => ids.includes(p.id)).map((p) => p.name).join(', ');
  return (
    <div className={s.final}>
      <span className={s.finalTag}>{strings.done}</span>
      <h2 className={s.finalTitle}>{strings.winner(names, top)}</h2>
      {ids.length === party.players.length && <p className={s.finalHint}>{strings.allTie}</p>}
    </div>
  );
}

/* ---------- Cài đặt (trước khi lật lá đầu tiên) ---------- */

function SettingsSheet({ party, open, onClose }: { party: FishParty; open: boolean; onClose: () => void }) {
  const st = party.state!;
  return (
    <Sheet open={open} title={strings.settingsTitle} closeLabel={strings.settingsDone} onClose={onClose}>
      <div className={s.settings}>
        <Chips
          label={strings.penaltyLabel}
          options={penaltyOptions}
          value={st.penalty ? 'on' : 'off'}
          onChange={(v) => party.dispatch({ type: 'config', config: { penalty: v === 'on' } })}
        />
        <Chips
          label={strings.finaleLabel}
          options={finaleOptions}
          value={st.finale ?? 'wheel'}
          onChange={(finale) => party.dispatch({ type: 'config', config: { finale } })}
        />
        <Button variant="primary" block onClick={onClose}>{strings.settingsDone}</Button>
      </div>
    </Sheet>
  );
}

function SettingsSummary({ party }: { party: FishParty }) {
  const st = party.state!;
  const [open, setOpen] = useState(false);
  const rows = [
    { label: strings.penaltyLabel, value: strings.penaltyOptions[st.penalty ? 'on' : 'off'] },
    { label: strings.finaleLabel, value: strings.finaleOptions[st.finale ?? 'wheel'] },
  ];
  return (
    <section className={cx(partyStyles.card, s.summary)} aria-label={strings.settings}>
      <dl className={s.summaryList}>
        {rows.map((row) => (
          <div key={row.label} className={s.summaryRow}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {party.isHost ? (
        <Button block onClick={() => setOpen(true)}>
          <Icon name="sliders" /> {strings.settings}
        </Button>
      ) : (
        <p className={s.summaryHint}>{strings.hostSets}</p>
      )}
      {party.isHost && <SettingsSheet party={party} open={open} onClose={() => setOpen(false)} />}
    </section>
  );
}

/* ---------- Màn chơi ---------- */

/**
 * Hiệu ứng xáo ba nhịp, giống xáo bài thật:
 * gom các lá úp thành xấp giữa bàn, tách đôi rồi xáo kiểu riffle, cuối cùng chia từng lá bay vòng cung về chỗ.
 */
const SHUFFLE_MS = 2200;

function useShuffleAnimation(board: RefObject<HTMLDivElement | null>, shuffles: number, fresh: boolean, sfx: (tone: 'tick' | 'tap') => void) {
  // Vào giữa ván thì không chạy lại; ván mới (chưa ai lật) thì xáo ngay khi mở.
  const played = useRef(fresh ? 0 : shuffles);
  const [busy, setBusy] = useState(false);
  const sfxRef = useRef(sfx);
  sfxRef.current = sfx;

  useLayoutEffect(() => {
    const el = board.current;
    if (!el || played.current === shuffles) return;
    const prev = played.current;
    played.current = shuffles;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const box = el.getBoundingClientRect();
    const midX = box.left + box.width / 2;
    const midY = box.top + box.height / 2;
    const split = Math.min(90, box.width * 0.22);
    const cards = [...el.querySelectorAll<HTMLElement>('[data-card]')];
    const n = cards.length || 1;
    // Lá xa tâm được gom trước, lá gần tâm sau: xấp bài "hút" từ ngoài vào.
    const byDistance = cards
      .map((card, i) => {
        const r = card.getBoundingClientRect();
        return { i, dx: midX - (r.left + r.width / 2), dy: midY - (r.top + r.height / 2) };
      })
      .sort((a, b) => Math.hypot(b.dx, b.dy) - Math.hypot(a.dx, a.dy));
    const gatherRank = new Map(byDistance.map((c, rank) => [c.i, rank]));

    const anims = cards.map((card, i) => {
      const { dx, dy } = byDistance.find((c) => c.i === i)!;
      const lift = -i * 0.3;
      const tilt = ((i * 37) % 17) - 8;
      const side = i % 2 ? 1 : -1;
      const pile = `translate(${dx + ((i * 7) % 5) - 2}px, ${dy + lift}px) rotate(${tilt * 0.4}deg) scale(1.5)`;
      const half = `translate(${dx + side * split}px, ${dy + lift + 6}px) rotate(${side * 14 + tilt * 0.3}deg) scale(1.5)`;
      const bend = `translate(${dx + side * split * 0.8}px, ${dy + lift - 4}px) rotate(${side * 22}deg) scale(1.5)`;
      const gatherAt = 0.08 + (gatherRank.get(i)! / n) * 0.16;
      const backAt = 0.5 + (i / n) * 0.1;
      const dealAt = 0.64 + (i / n) * 0.28;
      const flightMid = `translate(${dx * 0.45}px, ${dy * 0.45 - 28}px) rotate(${-tilt}deg) scale(1.14)`;
      return card.animate(
        [
          { transform: 'none', offset: 0 },
          { transform: 'none', offset: gatherAt - 0.08, easing: 'cubic-bezier(0.5, 0, 0.3, 1)' },
          { transform: pile, offset: gatherAt },
          { transform: pile, offset: 0.3 },
          { transform: half, offset: 0.37, easing: 'cubic-bezier(0.3, 0, 0.2, 1)' },
          { transform: bend, offset: 0.46 },
          { transform: pile, offset: backAt, easing: 'cubic-bezier(0.6, 0, 0.4, 1)' },
          { transform: pile, offset: dealAt },
          { transform: flightMid, offset: dealAt + 0.04, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
          { transform: 'none', offset: Math.min(1, dealAt + 0.08) },
          { transform: 'none', offset: 1 },
        ],
        { duration: SHUFFLE_MS, fill: 'backwards' },
      );
    });

    // Âm thanh: lạch cạch khi xáo riffle, tách tách khi chia bài.
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let k = 0; k < 10; k++) timers.push(setTimeout(() => sfxRef.current('tick'), (0.46 + k * 0.012) * SHUFFLE_MS));
    for (let k = 0; k < 9; k++) timers.push(setTimeout(() => sfxRef.current('tap'), (0.66 + k * 0.035) * SHUFFLE_MS));
    setBusy(true);
    timers.push(setTimeout(() => setBusy(false), SHUFFLE_MS));
    return () => {
      // Bị hủy giữa chừng (StrictMode chạy effect hai lần): cho lần chạy sau diễn lại.
      played.current = prev;
      anims.forEach((a) => a.cancel());
      timers.forEach(clearTimeout);
      setBusy(false);
    };
  }, [board, shuffles]);

  return busy;
}

function FishGame({ party }: { party: FishParty }) {
  const st = party.state!;
  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  const boardRef = useRef<HTMLDivElement>(null);
  const shuffling = useShuffleAnimation(boardRef, st.shuffles, !st.started, (tone) => sfxRef.current(tone));
  const inGame = party.mode === 'local' || party.players.some((p) => p.id === party.me);

  const flippedKey = st.flipped.join(',');
  useEffect(() => {
    if (!flippedKey) return;
    sfxRef.current('tap');
    vibrate(12);
  }, [flippedKey]);

  // Lật trượt: đợi một nhịp cho cả bàn nhìn 2 lá rồi vòng phạt mới trượt lên.
  const [panelSeq, setPanelSeq] = useState(st.phase === 'penalty' ? st.seq - (st.result ? 1 : 0) : -1);
  const penaltySeq = st.phase === 'penalty' && !st.result ? st.seq : -1;
  useEffect(() => {
    if (penaltySeq < 0) return;
    sfxRef.current('buzz');
    const id = setTimeout(() => setPanelSeq(penaltySeq), LOOK_MS);
    return () => clearTimeout(id);
  }, [penaltySeq]);

  // Kết quả qua vòng quay: hiện khi vòng dừng. Kết quả khác (câu được, bốc thăm): hiện sau một nhịp.
  const viaWheel = st.phase === 'penalty' || (st.phase === 'punish' && st.punish?.mode === 'wheel');
  const resultSeq = st.result?.seq;
  const resultSafe = !!st.result?.safe;
  const spinId = st.spin?.id;
  const [shownSeq, setShownSeq] = useState(resultSeq);
  const [revealedSpin, setRevealedSpin] = useState(spinId ?? 0);
  useEffect(() => {
    if (!resultSeq || viaWheel) return;
    const id = setTimeout(() => {
      setShownSeq(resultSeq);
      sfxRef.current(resultSafe ? 'win' : 'buzz');
    }, LOOK_MS);
    return () => clearTimeout(id);
  }, [resultSeq, viaWheel, resultSafe]);
  const onRevealed = useRef((id: number) => {
    setRevealedSpin(id);
    vibrate(120);
  }).current;
  const wheelDone = viaWheel && !!resultSeq && revealedSpin === spinId;
  useEffect(() => {
    if (wheelDone) sfxRef.current(resultSafe ? 'win' : 'buzz');
  }, [wheelDone, resultSafe]);
  const showResult = !!resultSeq && (viaWheel ? revealedSpin === spinId : shownSeq === resultSeq);
  const result = <ResultCard party={party} show={showResult} />;

  if (st.phase === 'done') {
    return (
      <div className={s.game}>
        <WinnerBanner party={party} />
        <Scores party={party} final />
        {party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.panelHint}>{strings.waitNewGame}</p>
        )}
        {result}
      </div>
    );
  }

  if (st.phase === 'punish' && st.punish) {
    const mode = st.punish.mode;
    return (
      <div className={s.game}>
        <WinnerBanner party={party} />
        <section className={s.punish}>
          <h3 className={s.panelTitle}>{strings.punishTitle(party.current?.name ?? '')}</h3>
          <Chips
            label={strings.modeLabel}
            options={modeOptions}
            value={mode}
            disabled={!party.isHost || st.punish.picked !== null}
            onChange={(m) => party.dispatch({ type: 'mode', mode: m })}
          />
          <p className={s.panelHint}>{strings.punishHint[mode]}</p>
          {mode === 'wheel' ? <SpinWheel key={`final-${st.turn}`} party={party} slices={strings.finals} onRevealed={onRevealed} /> : <Lots party={party} />}
        </section>
        <Scores party={party} final />
        {result}
      </div>
    );
  }

  const canFlip = party.myTurn && st.phase === 'pick' && st.flipped.length < 2 && !st.result && !shuffling;
  // Xáo bài chỉ trước khi trận bắt đầu (chưa ai lật lá nào); ai trong phòng cũng bấm được.
  const canShuffle = inGame && !st.started && !shuffling;
  const status =
    shuffling ? strings.shuffling
    : st.flipped.length === 2 ? strings.flipping
    : !party.myTurn ? strings.waitPick(party.current?.name ?? '')
    : st.flipped.length === 0 ? strings.pickFirst
    : strings.pickSecond;
  const showPenalty = st.phase === 'penalty' && panelSeq === st.seq - (st.result ? 1 : 0) && !showResult;

  return (
    <div className={s.game}>
      <div className={s.head}>
        <span className={s.status} aria-live="polite">{status}</span>
        <span className={s.left}>{strings.left(cardsLeft(st))}</span>
        {inGame && !st.started && (
          <button className={s.shuffleButton} disabled={!canShuffle} onClick={() => party.dispatch({ type: 'shuffle' })}>
            <Icon name="shuffle" size={18} /> {strings.shuffle}
          </button>
        )}
      </div>

      <div className={cx(s.board, shuffling && s.shuffling)} ref={boardRef}>
        {st.cards.map((card, i) => {
          const owner = st.taken[i];
          const up = st.flipped.includes(i);
          if (owner && !up) return <span key={i} className={s.empty} title={strings.taken(party.nameOf(owner))} aria-hidden="true" />;
          return (
            <button
              key={i}
              data-card
              className={cx(s.card, up && s.up, up && owner && s.caughtCard)}
              disabled={!canFlip || up}
              onClick={() => party.dispatch({ type: 'flip', index: i })}
              aria-label={up ? strings.card(strings.ranks[card.r], strings.suitNames[card.s]) : strings.faceDown(i + 1)}
            >
              <span className={s.inner}>
                <span className={s.back} />
                {/* Chỉ vẽ mặt bài khi đang ngửa, để không đọc trộm được trong HTML. */}
                {up && <CardFace card={card} />}
              </span>
            </button>
          );
        })}
      </div>

      {!st.started && <SettingsSummary party={party} />}
      <Scores party={party} />

      {showPenalty && (
        <div className={s.sheet} role="dialog" aria-label={strings.missTitle}>
          <h3 className={s.panelTitle}>{strings.missTitle}</h3>
          <p className={s.panelHint}>{strings.missHint}</p>
          <SpinWheel key={`miss-${panelSeq}`} party={party} slices={strings.penalties} onRevealed={onRevealed} />
        </div>
      )}
      {result}
    </div>
  );
}

export default function CauCa({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(fishGame, ctx);
  return (
    <PartyShell party={party} info={{ title: strings.title, rule: strings.rule, art: <FishArt /> }}>
      {party.state && <FishGame party={party} />}
    </PartyShell>
  );
}

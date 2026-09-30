import { useEffect, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { PartyShell, ResultCard, SpinWheel, useParty, vibrate, type PartyData } from '@bang/party';
import { Button, Icon, cx } from '@bang/ui';
import { cardsLeft, fishGame, getFinals, getPenalties, isRed, type Card, type FishParty } from './game';
import { strings } from './strings';
import { Lots, Scores, WinnerBanner } from './Panels';
import { FishSettings } from './Settings';
import { useShuffleAnimation } from './useShuffleAnimation';
import s from './Fish.module.css';
import iconSvg from '../icon.svg?raw';

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

function FishGame({ party }: { party: FishParty }) {
  const st = party.state!;
  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  const boardRef = useRef<HTMLDivElement>(null);
  const shuffling = useShuffleAnimation(boardRef, st.shuffles, !st.started, (tone) => sfxRef.current(tone));
  const inGame = party.mode === 'local' || party.players.some((p) => p.id === party.me);
  const [pendingFlip, setPendingFlip] = useState<number | null>(null);
  // Khi state từ server/host về đã bao gồm lá bài hoặc chuyển phase/hết lượt -> xóa pendingFlip
  useEffect(() => {
    if (pendingFlip !== null && (st.flipped.includes(pendingFlip) || !party.myTurn || st.phase !== 'pick')) {
      setPendingFlip(null);
    }
  }, [st.flipped, party.myTurn, st.phase, pendingFlip]);

  const displayedFlipped = pendingFlip !== null && !st.flipped.includes(pendingFlip)
    ? [...st.flipped, pendingFlip]
    : st.flipped;

  const flippedKey = displayedFlipped.join(',');
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

  // Cặp câu được: hai lá lật trùng số và đã được gán chủ sở hữu trong taken
  const isMatch = st.phase === 'pick' && st.flipped.length === 2 && st.taken[st.flipped[0]] !== null;
  useEffect(() => {
    if (!isMatch) return;
    sfxRef.current('win');
    vibrate([40, 60]);
    // Tự động sang lượt hoặc cho lật tiếp sau 850ms mà không hiện bảng thông báo che màn hình
    if (party.isHost && st.result) {
      const id = setTimeout(() => {
        party.dispatch({ type: 'next', seq: st.result!.seq });
      }, 850);
      return () => clearTimeout(id);
    }
  }, [isMatch, st.result, party]);

  // Kết quả qua vòng quay: hiện khi vòng dừng. Kết quả khác (phạt, bốc thăm): hiện sau một nhịp.
  const viaWheel = st.phase === 'penalty' || (st.phase === 'punish' && st.punish?.mode === 'wheel');
  const resultSeq = st.result?.seq;
  const resultSafe = !!st.result?.safe;
  const spinId = st.spin?.id;
  const [shownSeq, setShownSeq] = useState(resultSeq);
  const [revealedSpin, setRevealedSpin] = useState(spinId ?? 0);
  useEffect(() => {
    if (!resultSeq || viaWheel || isMatch) return;
    const id = setTimeout(() => {
      setShownSeq(resultSeq);
      sfxRef.current(resultSafe ? 'win' : 'buzz');
    }, LOOK_MS);
    return () => clearTimeout(id);
  }, [resultSeq, viaWheel, resultSafe, isMatch]);
  const onRevealed = useRef((id: number) => {
    setRevealedSpin(id);
    vibrate(120);
  }).current;
  const spin = () => party.dispatch({ type: 'spin' });
  const wheelDone = viaWheel && !!resultSeq && revealedSpin === spinId;
  useEffect(() => {
    if (wheelDone) sfxRef.current(resultSafe ? 'win' : 'buzz');
  }, [wheelDone, resultSafe]);
  // Bảng thông báo ResultCard chỉ hiện khi lật trượt, phạt cuối ván hoặc xong ván; KHÔNG che màn hình khi câu trúng
  const showResult = !isMatch && !!resultSeq && (viaWheel ? revealedSpin === spinId : shownSeq === resultSeq);
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
          <p className={s.panelHint}>{strings.punishHint[mode]}</p>
          {mode === 'wheel' ? <SpinWheel key={`final-${st.turn}`} party={party} spin={st.spin} slices={getFinals(st)} onSpin={spin} onRevealed={onRevealed} /> : <Lots party={party} />}
        </section>
        <Scores party={party} final />
        {result}
      </div>
    );
  }

  const canFlip = party.myTurn && st.phase === 'pick' && displayedFlipped.length < 2 && !st.result && !shuffling;
  // Xáo bài chỉ trước khi trận bắt đầu (chưa ai lật lá nào); ai trong phòng cũng bấm được.
  const canShuffle = inGame && !st.started && !shuffling;
  const status =
    shuffling ? strings.shuffling
    : displayedFlipped.length === 2 ? strings.flipping
    : !party.myTurn ? strings.waitPick(party.current?.name ?? '')
    : displayedFlipped.length === 0 ? strings.pickFirst
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
        {isMatch && (
          <div className={s.matchBadge} role="status">
            <span>✓ {st.again ? strings.caughtAgain : strings.caught}</span>
          </div>
        )}
        {st.cards.map((card, i) => {
          const owner = st.taken[i];
          const up = displayedFlipped.includes(i);
          if (owner && !up) return <span key={i} className={s.empty} title={strings.taken(party.nameOf(owner))} aria-hidden="true" />;
          return (
            <button
              key={i}
              data-card
              className={cx(s.card, up && s.up, up && owner && s.caughtCard)}
              disabled={!canFlip || up}
              onClick={() => {
                if (!up && canFlip) {
                  setPendingFlip(i);
                  party.dispatch({ type: 'flip', index: i });
                }
              }}
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

      <Scores party={party} />

      {showPenalty && (
        <div className={s.sheet} role="dialog" aria-label={strings.missTitle}>
          <h3 className={s.panelTitle}>{strings.missTitle}</h3>
          <p className={s.panelHint}>{strings.missHint}</p>
          <SpinWheel key={`miss-${panelSeq}`} party={party} spin={st.spin} slices={getPenalties(st)} onSpin={spin} onRevealed={onRevealed} />
        </div>
      )}
      {result}
    </div>
  );
}

export default function CauCa({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(fishGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <FishSettings {...p} />,
      }}
    >
      {party.state && <FishGame party={party} />}
    </PartyShell>
  );
}

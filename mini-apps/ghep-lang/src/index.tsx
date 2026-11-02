import { useEffect, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { CELLS, colOf, glGame, legal, placeScore, rowOf, seatOf, totalOf, wishMet, type GLParty, type GLState } from './game';
import { strings, type MarketOpt } from './strings';
import s from './GhepLang.module.css';
import iconSvg from '../icon.svg?raw';

const marketOptions = (Object.keys(strings.marketOptions) as MarketOpt[]).map((v) => ({ value: v, label: strings.marketOptions[v] }));

function GLSettings({ value, onChange, editable }: SettingsProps<GLState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.marketLabel} options={marketOptions} value={value.marketSize ?? '4'} onChange={(marketSize) => onChange({ marketSize })} disabled={!editable} />
    </SettingsCard>
  );
}

function GLGame({ party }: { party: GLParty }) {
  const st = party.state!;
  const mySeat = party.mode === 'local' ? st.turn : seatOf(st, party.me);
  const canAct = !st.done && mySeat >= 0 && mySeat === st.turn;
  const [slot, setSlot] = useState<number | null>(null);
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const turnName = party.nameOf(st.seats[st.turn]);
  const kind = slot !== null ? st.market[slot] : undefined;

  useEffect(() => setSlot(null), [st.turn, st.seq]);
  const lastCell = st.last?.cell;
  useEffect(() => {
    if (lastCell === undefined) return;
    sfx.current('tap');
    vibrate(15);
  }, [lastCell]);
  useEffect(() => {
    if (st.done) {
      sfx.current('win');
      vibrate([30, 50, 30]);
    }
  }, [st.done]);
  // Đến lượt mình thì rung nhẹ (chơi mạng).
  const myTurn = canAct && party.mode !== 'local';
  useEffect(() => {
    if (myTurn) vibrate([15, 30, 15]);
  }, [myTurn, st.turn]);

  const status = st.done
    ? strings.won(st.winners.map((i) => party.nameOf(st.seats[i])).join(', '))
    : mySeat < 0
      ? strings.watching
      : canAct
        ? kind !== undefined
          ? strings.placeHint(strings.kinds[kind])
          : strings.yourTurn
        : strings.waiting(turnName);

  const place = (cell: number) => {
    if (!canAct || slot === null || kind === undefined || !legal(st.cells, cell, kind)) return;
    party.dispatch({ type: 'place', slot, cell });
  };

  return (
    <div className={s.game}>
      <div className={s.head}>
        <span key={status} className={cx(s.status, canAct && s.statusOn, st.done && s.statusWin)} aria-live="polite">{status}</span>
        <span className={s.meta}>{strings.left(st.bag.length + st.market.length)}</span>
      </div>

      <div className={s.board} role="grid">
        {Array.from({ length: CELLS }, (_, cell) => {
          const t = st.cells[cell];
          const ok = canAct && kind !== undefined && !t && legal(st.cells, cell, kind);
          const isLast = st.last?.cell === cell;
          return (
            <button
              key={cell}
              className={cx(s.cell, t && s[`k${t.k}`], ok && s.ok, isLast && s.last)}
              data-seat={t && t.by >= 0 ? t.by : undefined}
              disabled={!ok}
              onClick={() => place(cell)}
              aria-label={strings.cell(rowOf(cell) + 1, colOf(cell) + 1, t ? strings.kinds[t.k] : '', t && t.by >= 0 ? party.nameOf(st.seats[t.by]) : '')}
            >
              {t && <span className={s.glyph} aria-hidden="true">{strings.glyph[t.k]}</span>}
              {t && t.by >= 0 && <span className={s.dot} aria-hidden="true" />}
              {ok && kind !== undefined && <span className={s.preview} aria-label={strings.preview(placeScore(st.cells, cell, kind))}>+{placeScore(st.cells, cell, kind)}</span>}
              {isLast && st.last!.gain > 0 && (
                <span className={s.float} key={st.seq} data-seat={st.last!.seat} aria-hidden="true">{strings.gain(st.last!.gain)}</span>
              )}
            </button>
          );
        })}
      </div>

      {!st.done && (
        <div className={s.marketBox}>
          <div className={s.market} role="radiogroup" aria-label="chợ mảnh">
            {st.market.map((k, i) => (
              <button
                key={`${i}-${k}-${st.seq}`}
                role="radio"
                aria-checked={slot === i}
                className={cx(s.piece, s[`k${k}`], slot === i && s.pieceOn)}
                disabled={!canAct}
                onClick={() => {
                  sfx.current('tick');
                  setSlot(slot === i ? null : i);
                }}
              >
                <span className={s.pieceGlyph} aria-hidden="true">{strings.glyph[k]}</span>
                <span className={s.pieceName}>{strings.kinds[k]}</span>
              </button>
            ))}
          </div>
          <p className={s.kindHint}>{kind !== undefined ? strings.kindHint[kind] : ' '}</p>
          {canAct && (
            <button className={s.pill} disabled={st.refreshed || st.score[st.turn] < 1 || !st.bag.length} onClick={() => party.dispatch({ type: 'refresh' })}>
              {strings.refresh}
            </button>
          )}
        </div>
      )}

      <ul className={s.players}>
        {st.seats.map((id, i) => (
          <li key={id} data-seat={i} className={cx(s.player, i === st.turn && !st.done && s.playerTurn, st.winners.includes(i) && s.playerWin)}>
            <div className={s.playerTop}>
              <span className={s.swatch} aria-hidden="true" />
              <span className={s.playerName}>{party.nameOf(id) || '?'}</span>
              <span className={s.playerScore}>
                {st.done ? strings.final(st.score[i], st.wishScore[i]) + ' = ' : ''}
                <b key={totalOf(st, i)}>{totalOf(st, i)}</b>
              </span>
            </div>
            <ul className={s.wishes} aria-label={strings.wishTitle}>
              {st.wishes[i].map((w, j) => {
                const met = st.done ? st.wishMet[i][j] : wishMet(st.cells, i, w);
                const wish = strings.wishes[w];
                return (
                  <li key={j} className={cx(s.wish, met && s.wishMet)}>
                    <span className={s.wishMark} aria-hidden="true">{met ? '✓' : '○'}</span>
                    <span><b>{wish.title}</b> {wish.text}</span>
                    <span className={s.wishPts}>{wish.pts}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        ))}
      </ul>

      {st.done &&
        (party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.hint}>{strings.waitNewGame}</p>
        ))}
    </div>
  );
}

export default function GhepLang({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(glGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <GLSettings {...p} />,
      }}
    >
      {party.state && <GLGame party={party} />}
    </PartyShell>
  );
}

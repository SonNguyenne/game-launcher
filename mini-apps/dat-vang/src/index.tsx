import { useEffect, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import {
  buyPrice,
  chainLength,
  districtOf,
  dvGame,
  investCost,
  landValue,
  lotValue,
  rentOf,
  seatOf,
  SIZE,
  SPECIALS,
  worth,
  type DVParty,
  type DVState,
} from './game';
import { strings, type RoundsOpt } from './strings';
import s from './DatVang.module.css';
import iconSvg from '../icon.svg?raw';

const roundOptions = (Object.keys(strings.roundsOptions) as RoundsOpt[]).map((v) => ({ value: v, label: strings.roundsOptions[v] }));

function DVSettings({ value, onChange, editable }: SettingsProps<DVState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.roundsLabel} options={roundOptions} value={value.rounds ?? '12'} onChange={(rounds) => onChange({ rounds })} disabled={!editable} />
    </SettingsCard>
  );
}

/** Ô thứ pos nằm ở hàng/cột nào của lưới 7×7 (cổng thành ở góc dưới phải, đi ngược chiều kim đồng hồ). */
function coord(p: number): [number, number] {
  if (p <= 6) return [7, 7 - p];
  if (p <= 12) return [7 - (p - 6), 1];
  if (p <= 18) return [1, p - 11];
  return [p - 17, 7];
}

const SPECIAL_GLYPH: Record<string, string> = { start: '⛩', rumor: '?', notary: '✎', tax: '%', pot: '◎', boom: '↑', fee: '¤' };

function Pips({ n }: { n: number }) {
  const on: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  return (
    <span className={s.die} aria-label={String(n)}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={cx(s.pip, on[n]?.includes(i) && s.pipOn)} />
      ))}
    </span>
  );
}

/** Số tiền/đất: nảy lên khi đổi và bay ra chênh lệch (+/-) rồi tan. */
function Count({ n }: { n: number }) {
  const prev = useRef(n);
  const [delta, setDelta] = useState<{ v: number; id: number } | null>(null);
  useEffect(() => {
    if (n === prev.current) return;
    const v = n - prev.current;
    prev.current = n;
    setDelta((d) => ({ v, id: (d?.id ?? 0) + 1 }));
    const timer = setTimeout(() => setDelta(null), 1100);
    return () => clearTimeout(timer);
  }, [n]);
  return (
    <b className={s.count}>
      <span key={delta?.id ?? 0} className={cx(delta && (delta.v > 0 ? s.bumpUp : s.bumpDown))}>{n}</span>
      {delta && (
        <em key={delta.id} className={cx(s.delta, delta.v > 0 ? s.deltaUp : s.deltaDown)} aria-hidden="true">
          {delta.v > 0 ? `+${delta.v}` : delta.v}
        </em>
      )}
    </b>
  );
}

/** Xúc xắc lắc khoảng 0,6 giây mỗi lần có lượt đổ mới, rồi dừng ở mặt thật. */
function useRolling(rollId: number, sfx: (t: 'tick') => void) {
  const [doneId, setDoneId] = useState(rollId);
  const [faces, setFaces] = useState<[number, number]>([1, 1]);
  useEffect(() => {
    if (rollId === doneId) return;
    let n = 0;
    const timer = setInterval(() => {
      n++;
      if (n > 8) {
        clearInterval(timer);
        setDoneId(rollId);
        return;
      }
      setFaces([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
      if (n % 2) sfx('tick');
    }, 70);
    vibrate(20);
    return () => clearInterval(timer);
  }, [rollId, doneId, sfx]);
  return rollId !== doneId ? faces : null;
}

/** Quân đi từng ô một tới vị trí mới (chờ xúc xắc dừng); nhảy xa hoặc lùi thì đặt thẳng. */
function useShownPos(pos: number[], rollId: number, sfx: (t: 'tap') => void) {
  const [shown, setShown] = useState(pos);
  const cur = useRef(pos);
  const lastRoll = useRef(rollId);
  const key = pos.join(',');
  useEffect(() => {
    const target = key.split(',').map(Number);
    const delay = lastRoll.current !== rollId ? 650 : 0;
    lastRoll.current = rollId;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      let moving = false;
      const next = target.map((t, i) => {
        const c = cur.current[i] ?? t;
        if (c === t) return t;
        if ((t - c + SIZE) % SIZE > 12) return t;
        moving = true;
        return (c + 1) % SIZE;
      });
      cur.current = next;
      setShown(next);
      if (moving) {
        sfx('tap');
        timer = setTimeout(step, 140);
      }
    };
    timer = setTimeout(step, delay);
    return () => clearTimeout(timer);
  }, [key, rollId, sfx]);
  return shown;
}

function TileCell({ st, pos, shown, selected, pickable, onPick }: { st: DVState; pos: number; shown: number[]; selected: boolean; pickable: boolean; onPick: (p: number) => void }) {
  const [r, c] = coord(pos);
  const lot = st.lots[pos];
  const special = SPECIALS[pos];
  const here = st.seats.map((_, i) => i).filter((i) => shown[i] === pos && !st.out[i]);
  const extra = lot ? (lot.owner === null ? strings.free : strings.rent(rentOf(st, pos))) : strings.tileInfo[pos] ?? '';
  return (
    <button
      className={cx(s.tile, special && s.special, lot && s[`d${districtOf(pos)}`], lot?.owner != null && s.owned, selected && s.selected, pickable && s.pickable)}
      style={{ gridRow: r, gridColumn: c }}
      data-owner={lot?.owner ?? undefined}
      onClick={() => onPick(pos)}
      aria-label={strings.cell(strings.tiles[pos], extra)}
    >
      {special ? (
        <span className={s.glyph} aria-hidden="true">{SPECIAL_GLYPH[special]}</span>
      ) : (
        <span className={s.price}>{lot && lot.owner !== null ? rentOf(st, pos) : buyPrice(st, pos)}</span>
      )}
      <span className={s.tileName}>{strings.tiles[pos]}</span>
      {lot && lot.level > 0 && <span className={s.stars} aria-hidden="true">{'★'.repeat(lot.level)}</span>}
      {here.length > 0 && (
        <span className={s.tokens} aria-hidden="true">
          {here.map((i) => (
            <span key={i} className={cx(s.token, i === st.turn && !st.done && s.tokenTurn)} data-seat={i} />
          ))}
        </span>
      )}
    </button>
  );
}

function LotInfo({ st, pos, party }: { st: DVState; pos: number; party: DVParty }) {
  const lot = st.lots[pos];
  if (!lot) {
    return (
      <div className={s.info}>
        <strong>{strings.tiles[pos]}</strong>
        <span>{strings.tileInfo[pos]}</span>
      </div>
    );
  }
  const d = districtOf(pos);
  return (
    <div className={s.info}>
      <strong>{strings.tiles[pos]}</strong>
      <span>{strings.districts[d]} · {strings.index(st.index[d])}</span>
      <span>
        {lot.owner === null ? strings.free : strings.owner(party.nameOf(st.seats[lot.owner]))} · {strings.value(lotValue(st, pos))}
      </span>
      {lot.owner !== null && (
        <span>
          {strings.rent(rentOf(st, pos))} · ×{chainLength(st, pos)} · {strings.level(lot.level)}
        </span>
      )}
    </div>
  );
}

function DVGame({ party }: { party: DVParty }) {
  const st = party.state!;
  const mySeat = party.mode === 'local' ? st.turn : seatOf(st, party.me);
  const canAct = !st.done && mySeat === st.turn && mySeat >= 0;
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const [stableSfx] = useState(() => (t: 'tick' | 'tap') => sfx.current(t));
  const faces = useRolling(st.rollId, stableSfx);
  const shown = useShownPos(st.pos, st.rollId, stableSfx);
  const [picked, setPicked] = useState<number | null>(null);
  const turnName = party.nameOf(st.seats[st.turn]);

  useEffect(() => {
    if (st.done) sfx.current('win');
  }, [st.done]);
  // Tới lượt mình: tiếng nhẹ và rung.
  const myTurnNow = canAct && st.phase === 'roll';
  useEffect(() => {
    if (myTurnNow) {
      sfx.current('tick');
      vibrate(12);
    }
  }, [myTurnNow, st.turn]);
  const outKey = st.out.join();
  useEffect(() => {
    if (outKey.includes('true')) {
      sfx.current('buzz');
      vibrate([60, 40, 60]);
    }
  }, [outKey]);
  // Đổi lượt hoặc đổ mới: bỏ ô đang chọn.
  useEffect(() => setPicked(null), [st.turn, st.rollId]);

  const pos = st.pos[st.turn];
  const notary = st.phase === 'notary';
  const pickable = (p: number) => notary && canAct && st.lots[p]?.owner === null && buyPrice(st, p, st.discount) <= st.cash[st.turn];
  const act = (a: Parameters<DVParty['dispatch']>[0]) => {
    sfx.current('tap');
    vibrate(10);
    party.dispatch(a);
  };

  const status = st.done
    ? strings.won(st.winners.map((i) => party.nameOf(st.seats[i])).join(', '))
    : mySeat < 0
      ? strings.watching
      : canAct
        ? strings.yourTurn
        : strings.waiting(turnName);

  const rolling = faces !== null;
  const shownDice = faces ?? st.dice;
  const card = !rolling && st.card ? st.card : null;
  const event = card ? strings.events[card.event] : null;
  const info = picked ?? (notary ? null : st.rollId > 0 && !rolling ? pos : null);

  return (
    <div className={s.game}>
      <div className={cx(s.head, canAct && s.headMine)}>
        <span className={s.status} aria-live="polite">{status}</span>
        <span className={s.meta}>{strings.round(st.round, Number(st.rounds))} · {strings.pot(st.pot)}</span>
      </div>

      <div className={s.board}>
        {Array.from({ length: SIZE }, (_, p) => (
          <TileCell key={p} st={st} pos={p} shown={shown} selected={picked === p} pickable={pickable(p)} onPick={setPicked} />
        ))}
        <div className={s.center}>
          <div className={s.indexRow}>
            {st.index.map((v, d) => (
              <span key={d} className={cx(s.indexChip, s[`d${d}`])}>
                {strings.districtShort[d]} <b>{v}%</b>
              </span>
            ))}
          </div>
          {shownDice && (
            <div className={cx(s.dice, rolling && s.rolling)} key={st.rollId}>
              <Pips n={shownDice[0]} />
              <Pips n={shownDice[1]} />
            </div>
          )}
          {event && card && (
            <div className={s.card} key={card.id} role="status">
              <strong>{event.title}</strong>
              <span>{event.text(strings.districts[card.district])}</span>
            </div>
          )}
          {!event && info !== null && <LotInfo st={st} pos={info} party={party} />}

        </div>
      </div>

      {canAct && !rolling && (
        <div className={s.actions}>
          {st.phase === 'roll' && (
            <Button variant="primary" block onClick={() => act({ type: 'roll' })}>{strings.roll}</Button>
          )}
          {st.phase === 'buy' && (
            <>
              <Button variant="primary" onClick={() => act({ type: 'buy' })}>{strings.buy(buyPrice(st, pos))}</Button>
              <Button onClick={() => act({ type: 'pass' })}>{strings.pass}</Button>
            </>
          )}
          {st.phase === 'invest' && (
            <>
              <Button variant="primary" onClick={() => act({ type: 'invest' })}>{strings.invest(investCost(pos))}</Button>
              <Button onClick={() => act({ type: 'pass' })}>{strings.pass}</Button>
            </>
          )}
          {notary && (
            <>
              <p className={s.prompt}>{strings.pickLot(st.discount)}</p>
              {picked !== null && pickable(picked) && (
                <Button variant="primary" onClick={() => act({ type: 'notary', pos: picked })}>{strings.buy(buyPrice(st, picked, st.discount))}</Button>
              )}
              <Button onClick={() => act({ type: 'pass' })}>{strings.pass}</Button>
            </>
          )}
          {st.phase === 'boom' && (
            <>
              <p className={s.prompt}>{strings.pickDistrict}</p>
              <div className={s.districtPick}>
                {strings.districtShort.map((name, d) => (
                  <button key={d} className={cx(s.districtBtn, s[`d${d}`])} onClick={() => act({ type: 'boom', district: d })}>{name}</button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <ul className={s.players}>
        {st.seats.map((id, i) => (
          <li key={id} className={cx(s.player, i === st.turn && !st.done && s.playerTurn, st.out[i] && s.playerOut, st.winners.includes(i) && s.playerWin)}>
            <span className={s.token} data-seat={i} aria-hidden="true" />
            <span className={s.playerName}>{party.nameOf(id) || '?'}</span>
            {st.out[i] ? (
              <span className={s.playerMoney}>{strings.bankrupt}</span>
            ) : (
              <span className={s.playerMoney}>
                {strings.cash} <Count n={st.cash[i]} /> · {strings.land} <Count n={landValue(st, i)} />
                {st.done && <> · {strings.worth} <b>{worth(st, i)}</b></>}
              </span>
            )}
          </li>
        ))}
      </ul>

      <ol className={s.log} aria-label="nhật ký">
        {st.log.slice(-4).reverse().map((line, i) => (
          <li key={`${st.seq}-${i}`} className={cx(i === 0 && s.logNew)}>{line}</li>
        ))}
      </ol>

      {st.done && (
        <div className={s.banner} role="status">
          <span className={s.bannerTag}>{strings.champion}</span>
          <strong>{st.winners.map((i) => party.nameOf(st.seats[i])).join(', ')}</strong>
        </div>
      )}
      {st.done &&
        (party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.hint}>{strings.waitNewGame}</p>
        ))}
    </div>
  );
}

export default function DatVang({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(dvGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <DVSettings {...p} />,
      }}
    >
      {party.state && <DVGame party={party} />}
    </PartyShell>
  );
}


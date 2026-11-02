import { useEffect, useRef, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import {
  canBuild,
  canPay,
  CELLS,
  colOf,
  COST,
  khGame,
  N,
  points,
  rowOf,
  season,
  SEASON_RES,
  seatOf,
  tradeRate,
  type KHParty,
  type KHState,
  type Mode,
} from './game';
import { strings, type TargetOpt } from './strings';
import s from './KhaiHoang.module.css';
import iconSvg from '../icon.svg?raw';

const targetOptions = (Object.keys(strings.targetOptions) as TargetOpt[]).map((v) => ({ value: v, label: strings.targetOptions[v] }));
const MODES: Mode[] = ['claim', 'house', 'dike'];

function KHSettings({ value, onChange, editable }: SettingsProps<KHState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.targetLabel} options={targetOptions} value={value.target ?? '16'} onChange={(target) => onChange({ target })} disabled={!editable} />
    </SettingsCard>
  );
}

function Pips({ n, tone }: { n: number; tone: 'row' | 'col' }) {
  const on: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  return (
    <span className={cx(s.die, tone === 'row' && s.dieRow)} aria-label={String(n)}>
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className={cx(s.pip, on[n]?.includes(i) && s.pipOn)} />
      ))}
    </span>
  );
}

/** Số sản vật: nảy lên (tăng) hoặc rung (giảm) mỗi khi đổi giá trị. */
function Count({ n }: { n: number }) {
  const prev = useRef(n);
  const [dir, setDir] = useState<'up' | 'down' | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (n === prev.current) return;
    setDir(n > prev.current ? 'up' : 'down');
    setTick((t) => t + 1);
    prev.current = n;
  }, [n]);
  return <b key={tick} className={cx(dir === 'up' && s.bumpUp, dir === 'down' && s.bumpDown)}>{n}</b>;
}

/** Xúc xắc lắc khoảng 0,6 giây mỗi lần đổ mới rồi mới lộ mặt thật. */
function useRolling(rollId: number, sfx: () => void) {
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
      if (n % 2) sfx();
    }, 70);
    vibrate(20);
    return () => clearInterval(timer);
  }, [rollId, doneId, sfx]);
  return rollId !== doneId ? faces : null;
}

function Market({ st, seat, onTrade }: { st: KHState; seat: number; onTrade: (give: number, get: number) => void }) {
  const [give, setGive] = useState(st.hot as number);
  const [get, setGet] = useState(give === 0 ? 1 : 0);
  const rate = tradeRate(st, give);
  const ok = give !== get && st.res[seat][give] >= rate;
  return (
    <div className={s.market}>
      <p className={s.marketHot}>{strings.hot(strings.res[st.hot])}</p>
      <div className={s.marketRow}>
        <span className={s.marketLabel}>{strings.give}</span>
        {strings.res.map((name, k) => (
          <button key={k} className={cx(s.resBtn, give === k && s.resOn)} onClick={() => setGive(k)} aria-pressed={give === k}>
            {strings.resGlyph[k]} <span>{tradeRate(st, k)}</span>
            <span className={s.sr}>{name}</span>
          </button>
        ))}
      </div>
      <div className={s.marketRow}>
        <span className={s.marketLabel}>{strings.get}</span>
        {strings.res.map((name, k) => (
          <button key={k} className={cx(s.resBtn, get === k && s.resOn)} onClick={() => setGet(k)} aria-pressed={get === k} disabled={k === give}>
            {strings.resGlyph[k]} <span>1</span>
            <span className={s.sr}>{name}</span>
          </button>
        ))}
      </div>
      <Button block disabled={!ok} onClick={() => onTrade(give, get)}>{strings.trade(rate, strings.res[give], strings.res[get])}</Button>
    </div>
  );
}

function KHGame({ party }: { party: KHParty }) {
  const st = party.state!;
  const mySeat = party.mode === 'local' ? st.turn : seatOf(st, party.me);
  const canAct = !st.done && mySeat >= 0 && mySeat === st.turn;
  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const [tick] = useState(() => () => sfx.current('tick'));
  const faces = useRolling(st.rollId, tick);
  const rolling = faces !== null;
  const [mode, setMode] = useState<Mode | null>(null);
  const [marketOpen, setMarketOpen] = useState(false);
  const turnName = party.nameOf(st.seats[st.turn]);

  useEffect(() => {
    setMode(null);
    setMarketOpen(false);
  }, [st.turn, st.phase]);
  useEffect(() => {
    if (st.done) sfx.current('win');
  }, [st.done]);
  // Vừa tới lượt mình: báo bằng tiếng và rung nhẹ.
  const myTurnNow = canAct && !st.done;
  useEffect(() => {
    if (myTurnNow && st.round > 0) {
      sfx.current('tick');
      vibrate(12);
    }
  }, [myTurnNow, st.turn, st.round]);
  useEffect(() => {
    if (!rolling && st.flood && st.rollId > 0) {
      sfx.current('buzz');
      vibrate([40, 30, 40]);
    }
  }, [rolling, st.flood, st.rollId]);

  const act = (a: Parameters<KHParty['dispatch']>[0]) => {
    sfx.current('tap');
    vibrate(10);
    party.dispatch(a);
  };

  const viewSeat = mySeat >= 0 ? mySeat : st.turn;
  const dice = faces ?? st.dice;
  const showHit = !rolling && st.dice && st.phase === 'build';
  const hitRow = showHit ? st.dice![0] - 1 : -1;
  const hitCol = showHit ? st.dice![1] - 1 : -1;
  const target = Number(st.target);
  const se = season(st.round);

  const status = st.done
    ? strings.won(party.nameOf(st.seats[st.winner ?? 0]))
    : st.phase === 'setup'
      ? canAct
        ? strings.setupPick
        : strings.setupWait(turnName)
      : mySeat < 0
        ? strings.watching
        : canAct
          ? mode
            ? strings.pickTile(strings.modes[mode])
            : strings.yourTurn
          : strings.waiting(turnName);

  const valid = (cell: number) => {
    if (!canAct || rolling) return false;
    if (st.phase === 'setup') return st.owner[cell] === null;
    return st.phase === 'build' && mode !== null && canBuild(st, st.turn, mode, cell);
  };
  const tapCell = (cell: number) => {
    if (!valid(cell)) return;
    if (st.phase === 'setup') act({ type: 'pick', cell });
    else if (mode) act({ type: 'build', mode, cell });
  };

  return (
    <div className={s.game}>
      <div className={cx(s.head, canAct && s.headMine)}>
        <span className={s.status} aria-live="polite">{status}</span>
        <span className={s.meta}>
          {strings.round(st.round)} · {strings.target(target)}
        </span>
      </div>
      <div className={s.seasonBar}>
        <span className={s.seasonChip} data-res={SEASON_RES[se]}>{strings.season(strings.seasons[se], `${strings.resGlyph[SEASON_RES[se]]} ${strings.res[SEASON_RES[se]]}`)}</span>
        {dice && (
          <span className={cx(s.dice, rolling && s.rolling)} key={st.rollId}>
            <Pips n={dice[0]} tone="row" />
            <Pips n={dice[1]} tone="col" />
          </span>
        )}
      </div>

      {showHit && st.flood && (
        <p className={s.floodBanner} key={st.rollId} role="status">{strings.flood}</p>
      )}
      <div className={cx(s.boardWrap, showHit && st.flood && s.flooding)}>
        <div className={s.colHead} aria-hidden="true">
          <span />
          {Array.from({ length: N }, (_, c) => (
            <span key={c} className={cx(c === hitCol && s.headHit)}>{c + 1}</span>
          ))}
        </div>
        <div className={s.boardRow}>
          <div className={s.rowHead} aria-hidden="true">
            {Array.from({ length: N }, (_, r) => (
              <span key={r} className={cx(r === hitRow && s.headHitRow)}>{r + 1}</span>
            ))}
          </div>
          <div className={s.board} role="grid">
            {Array.from({ length: CELLS }, (_, cell) => {
              const t = st.terrain[cell];
              const o = st.owner[cell];
              const hit = rowOf(cell) === hitRow || colOf(cell) === hitCol;
              const gain = hit && o !== null && !(st.flood && !st.dike[cell]);
              return (
                <button
                  key={cell}
                  className={cx(s.cell, s[`t${t}`], o !== null && s.owned, hit && s.hit, valid(cell) && s.valid)}
                  data-seat={o ?? undefined}
                  onClick={() => tapCell(cell)}
                  disabled={!valid(cell)}
                  aria-label={strings.cell(rowOf(cell) + 1, colOf(cell) + 1, strings.terrain[t], o !== null ? party.nameOf(st.seats[o]) : '')}
                >
                  <span className={s.glyph} aria-hidden="true">{strings.resGlyph[t]}</span>
                  {st.house[cell] && <span className={s.house} aria-hidden="true">⌂</span>}
                  {st.dike[cell] && <span className={s.dike} aria-hidden="true" />}
                  {mode && valid(cell) && (
                    <span className={s.ghost} data-seat={st.turn} aria-hidden="true">{strings.modeGlyph[mode]}</span>
                  )}
                  {st.phase === 'setup' && valid(cell) && (
                    <span className={s.ghost} data-seat={st.turn} aria-hidden="true">{strings.modeGlyph.claim}</span>
                  )}
                  {gain && <span className={s.gain} key={st.rollId} aria-hidden="true">+</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {canAct && st.phase === 'roll' && !rolling && (
        <Button variant="primary" block onClick={() => act({ type: 'roll' })}>{strings.roll}</Button>
      )}

      {canAct && st.phase === 'build' && !rolling && (
        <div className={s.tools}>
          <div className={s.modes}>
            {MODES.map((m) => {
              const afford = canPay(st.res[st.turn], COST[m]);
              return (
                <button key={m} className={cx(s.mode, mode === m && s.modeOn)} disabled={!afford} onClick={() => setMode(mode === m ? null : m)} aria-pressed={mode === m}>
                  <strong>{strings.modes[m]}</strong>
                  <small>{strings.costs[m]}</small>
                </button>
              );
            })}
            <button className={s.mode} disabled={!canPay(st.res[st.turn], COST.offer)} onClick={() => act({ type: 'offer' })}>
              <strong>{strings.offer}</strong>
              <small>{strings.costs.offer}</small>
            </button>
          </div>
          <div className={s.toolRow}>
            <Button onClick={() => setMarketOpen((v) => !v)} aria-expanded={marketOpen}>{strings.market}</Button>
            <Button variant="primary" onClick={() => act({ type: 'end' })}>{strings.endTurn}</Button>
          </div>
          {marketOpen && <Market st={st} seat={st.turn} onTrade={(give, get) => act({ type: 'trade', give, get })} />}
        </div>
      )}

      <ul className={s.players}>
        {st.seats.map((id, i) => {
          const g = st.gains[i];
          return (
            <li key={id} data-seat={i} className={cx(s.player, i === st.turn && !st.done && s.playerTurn, st.winner === i && s.playerWin, i === viewSeat && s.playerMe)}>
              <span className={s.swatch} data-seat={i} aria-hidden="true" />
              <span className={s.playerName}>{party.nameOf(id) || '?'}</span>
              <span className={s.res}>
                {st.res[i].map((n, k) => (
                  <span key={k} className={s.resItem}>
                    {strings.resGlyph[k]}
                    <Count n={n} />
                    {!rolling && st.phase === 'build' && g[k] > 0 && (
                      <em className={s.plus} key={st.rollId}>{strings.gained(g[k])}</em>
                    )}
                  </span>
                ))}
              </span>
              <span className={s.pts}>
                <span className={s.ptsBar} style={{ width: `${Math.min(100, (points(st, i) / target) * 100)}%` }} />
                <b>{points(st, i)}</b>
              </span>
            </li>
          );
        })}
      </ul>

      <ol className={s.log} aria-label="nhật ký">
        {st.log.slice(-3).reverse().map((line, i) => (
          <li key={`${st.seq}-${i}`} className={cx(i === 0 && s.logNew)}>{line}</li>
        ))}
      </ol>

      {st.done && (
        <div className={s.banner} role="status">
          <span className={s.bannerTag}>{strings.victory}</span>
          <strong>{party.nameOf(st.seats[st.winner ?? 0])}</strong>
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

export default function KhaiHoang({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(khGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <KHSettings {...p} />,
      }}
    >
      {party.state && <KHGame party={party} />}
    </PartyShell>
  );
}

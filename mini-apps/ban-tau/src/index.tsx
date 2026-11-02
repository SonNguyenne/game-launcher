import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { FLEET, SIZE, isSunk, opp, randomFleet, seatOf, shipCells, shipGame, type Seat, type Ship, type ShipParty, type ShipState } from './game';
import { cellName, strings, type ChainRule } from './strings';
import s from './BanTau.module.css';
import iconSvg from '../icon.svg?raw';

const chainOptions = (Object.keys(strings.chainOptions) as ChainRule[]).map((v) => ({ value: v, label: strings.chainOptions[v] }));

function ShipSettings({ value, onChange, editable }: SettingsProps<ShipState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.chainLabel} options={chainOptions} value={value.chain ?? 'on'} onChange={(chain) => onChange({ chain })} disabled={!editable} />
    </SettingsCard>
  );
}

/** Ô thuộc tàu nào, nằm ở đầu/đuôi để bo tròn mũi tàu. */
function shipParts(ships: readonly Ship[]) {
  const parts = new Map<number, string>();
  for (const sh of ships) {
    const sorted = sh.slice().sort((a, b) => a - b);
    const vertical = sorted.length > 1 && sorted[1] - sorted[0] === SIZE;
    sorted.forEach((x, i) => {
      const cls = [vertical ? s.v : s.h, i === 0 && s.head, i === sorted.length - 1 && s.tail];
      parts.set(x, cx(s.ship, ...cls));
    });
  }
  return parts;
}

interface SeaProps {
  /** Tàu được vẽ (tàu mình, tàu đã chìm, hoặc cả đội khi hết ván). */
  ships: readonly Ship[];
  /** Tàu thật của biển này, để biết ô bắn trúng hay trượt. */
  fleet: readonly Ship[];
  shots: readonly number[];
  last?: number | null;
  onTap?: (cell: number) => void;
  canTap?: (cell: number) => boolean;
  small?: boolean;
  label: string;
  /** Tàu lộ ra có hiệu ứng nổi lên (biển đối thủ). */
  reveal?: boolean;
  /** Ô đang xem trước khi kéo tàu vào. */
  preview?: { cells: readonly number[]; ok: boolean } | null;
  onHover?: (cell: number | null) => void;
}

function Sea({ ships, fleet, shots, last, onTap, canTap, small, label, reveal, preview, onHover }: SeaProps) {
  const parts = useMemo(() => shipParts(ships), [ships]);
  const occupied = useMemo(() => new Set(fleet.flat()), [fleet]);
  const shot = new Set(shots);
  const pv = new Set(preview?.cells);
  return (
    <div className={cx(s.sea, small && s.seaSmall)} role="grid" aria-label={label} onPointerLeave={() => onHover?.(null)}>
      <span className={s.corner} />
      {Array.from({ length: SIZE }, (_, c) => (
        <span key={`c${c}`} className={s.axis}>{strings.cols[c]}</span>
      ))}
      {Array.from({ length: SIZE }, (_, r) => (
        <Row key={r} r={r}>
          {Array.from({ length: SIZE }, (_, c) => {
            const i = r * SIZE + c;
            const isShot = shot.has(i);
            const hit = isShot && occupied.has(i);
            const tappable = !!onTap && (canTap ? canTap(i) : true);
            const state = isShot ? (hit ? strings.hit : strings.miss) : parts.has(i) ? strings.shipHere : undefined;
            return (
              <button
                key={i}
                data-cell={i}
                className={cx(s.cell, parts.get(i), reveal && parts.has(i) && s.reveal, isShot && (hit ? s.hit : s.miss), i === last && s.last, pv.has(i) && (preview?.ok ? s.pvOk : s.pvBad))}
                disabled={!tappable}
                onClick={() => onTap?.(i)}
                onPointerEnter={() => onHover?.(i)}
                aria-label={strings.cell(cellName(i), state)}
              >
                {i === last && isShot && (
                  <>
                    <i className={s.shell} aria-hidden="true" />
                    <i className={hit ? s.blast : s.splash} aria-hidden="true" />
                  </>
                )}
              </button>
            );
          })}
        </Row>
      ))}
    </div>
  );
}

function Row({ r, children }: { r: number; children: ReactNode }) {
  return (
    <>
      <span className={s.axis}>{r + 1}</span>
      {children}
    </>
  );
}

function Score({ party }: { party: ShipParty }) {
  const st = party.state!;
  return (
    <div className={s.score} aria-label={strings.score}>
      {st.seats.map((id, i) => {
        const seat = i as Seat;
        const left = st.fleets[seat].filter((sh) => !isSunk(sh, st.shots[opp(seat)])).length;
        const on = st.phase === 'battle' ? st.shooter === seat : st.phase === 'place' && !st.ready[seat] && (party.mode !== 'local' || st.turn === seat);
        return (
          <div key={seat} className={cx(s.seat, on && s.seatOn)}>
            <Avatar name={party.nameOf(id) || '?'} />
            <div className={s.seatMain}>
              <span className={s.seatName}>{party.nameOf(id)}</span>
              <small className={s.seatSub}>{st.phase === 'place' ? (st.ready[seat] ? strings.ready : '…') : strings.left(left)}</small>
            </div>
            <span className={s.wins}>{st.wins[id] ?? 0}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Bàn xếp tàu của một ghế. Nháp chỉ nằm trên máy cho tới khi bấm sẵn sàng. */
function Placement({ party, seat }: { party: ShipParty; seat: Seat }) {
  const [draft, setDraft] = useState<(Ship | null)[]>(() => FLEET.map(() => null));
  const [pick, setPick] = useState<number | null>(0);
  const [vertical, setVertical] = useState(false);
  const placed = draft.filter(Boolean) as Ship[];
  const nextFree = (d: (Ship | null)[], from = 0) => {
    for (let k = 0; k < FLEET.length; k++) {
      const j = (from + k) % FLEET.length;
      if (!d[j]) return j;
    }
    return null;
  };

  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  const dropped = useRef(false);

  const fits = (cell: number, k: number) => {
    const cells = shipCells(cell, FLEET[k], vertical);
    return cells && !cells.some((x) => placed.some((sh) => sh.includes(x))) ? cells : null;
  };
  /** Ô đang trỏ tới: xem trước tàu sắp đặt (xanh nếu vừa, đỏ nếu không). */
  const preview =
    hover !== null && pick !== null && !draft[pick]
      ? (() => {
          const cells = fits(hover, pick);
          return cells ? { cells, ok: true } : { cells: shipCells(hover, FLEET[pick], vertical) ?? [hover], ok: false };
        })()
      : null;

  const place = (cell: number) => {
    if (pick === null) return;
    const cells = fits(cell, pick);
    if (!cells) {
      party.sfx('buzz');
      vibrate(30);
      return;
    }
    const next = draft.map((x, k) => (k === pick ? cells : x));
    setDraft(next);
    setPick(nextFree(next, pick));
    party.sfx('tap');
    vibrate(8);
  };
  const tap = (cell: number) => {
    const owner = draft.findIndex((sh) => sh?.includes(cell));
    if (owner >= 0) {
      const sh = draft[owner]!;
      setVertical(sh.length > 1 && Math.abs(sh[1] - sh[0]) === SIZE);
      setDraft(draft.map((x, k) => (k === owner ? null : x)));
      setPick(owner);
      party.sfx('tick');
      return;
    }
    place(cell);
  };
  const cellAt = (e: ReactPointerEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-cell]');
    return el ? Number(el.getAttribute('data-cell')) : null;
  };

  const done = placed.length === FLEET.length;
  return (
    <div className={s.place}>
      <h3 className={s.title}>{party.mode === 'local' ? strings.placeFor(party.nameOf(party.state!.seats[seat])) : strings.placeTitle}</h3>
      <p className={s.hint}>{strings.placeHint}</p>
      <div className={s.tray}>
        {FLEET.map((len, k) => (
          <button
            key={k}
            className={cx(s.trayShip, k === pick && s.trayOn, draft[k] && s.trayDone)}
            onClick={() => {
              if (dropped.current) {
                dropped.current = false;
                return;
              }
              if (draft[k]) setDraft(draft.map((x, j) => (j === k ? null : x)));
              setPick(k);
            }}
            onPointerDown={(e) => {
              // Kéo tàu từ khay thả vào biển.
              e.currentTarget.setPointerCapture(e.pointerId);
              dragging.current = true;
              dropped.current = false;
              if (draft[k]) setDraft(draft.map((x, j) => (j === k ? null : x)));
              setPick(k);
            }}
            onPointerMove={(e) => dragging.current && setHover(cellAt(e))}
            onPointerUp={(e) => {
              if (!dragging.current) return;
              dragging.current = false;
              const cell = cellAt(e);
              setHover(null);
              if (cell !== null) {
                dropped.current = true;
                place(cell);
              }
            }}
            onPointerCancel={() => {
              dragging.current = false;
              setHover(null);
            }}
            aria-label={strings.ship(len)}
            aria-pressed={k === pick}
          >
            {Array.from({ length: len }, (_, j) => <span key={j} className={s.trayBlock} />)}
          </button>
        ))}
      </div>
      <div className={s.tools}>
        <button className={s.pill} onClick={() => setVertical((v) => !v)}>
          {strings.rotate}: {vertical ? strings.vertical : strings.horizontal}
        </button>
        <button
          className={s.pill}
          onClick={() => {
            setDraft(randomFleet());
            setPick(null);
            party.sfx('tap');
          }}
        >
          {strings.random}
        </button>
        <button
          className={s.pill}
          disabled={!placed.length}
          onClick={() => {
            setDraft(FLEET.map(() => null));
            setPick(0);
          }}
        >
          {strings.clear}
        </button>
      </div>
      <Sea ships={placed} fleet={placed} shots={[]} onTap={tap} label={strings.placeTitle} preview={preview} onHover={setHover} />
      <Button variant="primary" block disabled={!done} onClick={() => party.dispatch({ type: 'ready', ships: placed })}>
        {strings.ready}
      </Button>
    </div>
  );
}

function shotText(party: ShipParty, st: ShipState) {
  const shot = st.lastShot;
  if (!shot) return null;
  const what = shot.sunk ? strings.sunk(shot.sunk) : shot.hit ? strings.hit : strings.miss;
  return strings.shotLine(party.nameOf(st.seats[shot.seat]), cellName(shot.cell), what);
}

function Battle({ party, seat }: { party: ShipParty; seat: Seat | null }) {
  const st = party.state!;
  const over = st.phase === 'over';
  const viewSeat: Seat = seat ?? 0;
  const enemy = opp(viewSeat);
  const myTurn = !over && seat !== null && st.shooter === seat;
  const name = (x: Seat) => party.nameOf(st.seats[x]);
  // Biển đối thủ chỉ vẽ tàu đã chìm; hết ván thì lộ hết.
  const sunkOrAll = (x: Seat) => (over ? st.fleets[x] : st.fleets[x].filter((sh) => isSunk(sh, st.shots[opp(x)])));
  const last = st.lastShot;
  const mineShown = seat !== null || over;

  const status = over
    ? strings.won(name(st.winner!))
    : seat === null
      ? `${strings.watching} · ${strings.waitShot(name(st.shooter))}`
      : myTurn
        ? strings.yourShot
        : strings.waitShot(name(st.shooter));

  return (
    <div className={s.battle}>
      <div className={s.head}>
        <span className={s.status} aria-live="polite">{status}</span>
      </div>
      {last && (
        <p className={cx(s.shot, last.hit && s.shotHit, last.sunk !== null && s.shotSunk)} key={`${last.seat}-${last.cell}`} role="status">
          {shotText(party, st)}
          {!over && last.hit && st.chain === 'on' && <span className={s.again}> · {strings.again}</span>}
        </p>
      )}
      <section className={s.zone}>
        <h3 className={s.zoneTitle}>{strings.enemySea(name(enemy))}</h3>
        <div className={cx(s.radar, myTurn && s.radarLive)}>
          <Sea
            ships={sunkOrAll(enemy)}
            fleet={st.fleets[enemy]}
            shots={st.shots[viewSeat]}
            last={last?.seat === viewSeat ? last.cell : null}
            onTap={myTurn ? (cell) => party.dispatch({ type: 'fire', cell }) : undefined}
            canTap={(cell) => !st.shots[viewSeat].includes(cell)}
            label={strings.enemySea(name(enemy))}
            reveal
          />
        </div>
      </section>
      <section className={s.zone}>
        <h3 className={s.zoneTitle}>{seat !== null ? strings.mySea : strings.seaOf(name(viewSeat))}</h3>
        <Sea
          ships={mineShown ? st.fleets[viewSeat] : sunkOrAll(viewSeat)}
          fleet={st.fleets[viewSeat]}
          shots={st.shots[enemy]}
          last={last?.seat === enemy ? last.cell : null}
          small
          label={strings.mySea}
        />
      </section>
      {over && (
        <div className={s.banner} role="status">
          <span className={s.bannerTag}>{strings.victory}</span>
          <strong>{name(st.winner!)}</strong>
        </div>
      )}
      {over &&
        (party.isHost ? (
          <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
        ) : (
          <p className={s.hint}>{strings.waitNewGame}</p>
        ))}
    </div>
  );
}

function Cover({ name, note, onOpen }: { name: string; note: string | null; onOpen: () => void }) {
  return (
    <button className={s.cover} onClick={onOpen}>
      {note && <span className={s.coverNote}>{note}</span>}
      <span className={s.coverTitle}>{strings.passTo(name)}</span>
      <span className={s.hint}>{strings.passHint}</span>
      <span className={s.coverTap}>{strings.tapToSee}</span>
    </button>
  );
}

function ShipGame({ party }: { party: ShipParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const actor = st.turn as Seat;
  const seat: Seat | null = local ? actor : seatOf(st, party.me);

  // Chơi 1 máy: đổi người thì che màn cho tới khi người mới chạm.
  const coverKey = st.phase === 'over' ? null : `${st.phase}:${actor}:${st.first}`;
  const [seen, setSeen] = useState<string | null>(null);
  const covered = local && coverKey !== null && seen !== coverKey;

  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const shotCount = st.shots[0].length + st.shots[1].length;
  const lastRef = useRef(st.lastShot);
  lastRef.current = st.lastShot;
  useEffect(() => {
    const shot = lastRef.current;
    if (!shotCount || !shot) return;
    if (shot.sunk) {
      sfx.current('buzz');
      vibrate([40, 60, 40]);
    } else if (shot.hit) {
      sfx.current('tap');
      vibrate(30);
    } else sfx.current('tick');
  }, [shotCount]);
  useEffect(() => {
    if (st.phase === 'over') sfx.current('win');
  }, [st.phase]);

  if (covered) {
    return (
      <div className={s.game}>
        <Score party={party} />
        <Cover name={party.nameOf(st.seats[actor])} note={st.phase === 'battle' ? shotText(party, st) : null} onOpen={() => setSeen(coverKey)} />
      </div>
    );
  }

  let body: ReactNode;
  if (st.phase === 'place') {
    if (seat !== null && !st.ready[seat]) body = <Placement key={seat} party={party} seat={seat} />;
    else if (seat !== null) {
      body = (
        <div className={s.place}>
          <p className={s.status} role="status">{strings.waitPlace(party.nameOf(st.seats[opp(seat)]))}</p>
          <Sea ships={st.fleets[seat]} fleet={st.fleets[seat]} shots={[]} label={strings.mySea} />
          <Button block onClick={() => party.dispatch({ type: 'unready' })}>{strings.unready}</Button>
        </div>
      );
    } else {
      const waiting = st.seats.filter((_, i) => !st.ready[i]).map((id) => party.nameOf(id)).join(', ');
      body = <p className={s.status} role="status">{strings.watchingPlace(waiting)}</p>;
    }
  } else body = <Battle party={party} seat={seat} />;

  return (
    <div className={s.game}>
      <Score party={party} />
      {body}
    </div>
  );
}

export default function BanTau({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(shipGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <ShipSettings {...p} />,
      }}
    >
      {party.state && <ShipGame party={party} />}
    </PartyShell>
  );
}

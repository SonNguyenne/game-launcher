import { useEffect, useRef } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Avatar, Chips, PartyShell, SettingsCard, useParty, vibrate, type PartyData, type SettingsProps } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { COLS, ROWS, groupOf } from './cards';
import { MAX_HP, atGate, bossPower, cellId, dungeonGame, expedOf, reachable, scoreOf, type DungeonParty, type DungeonState, type Mode, type SeedMode } from './game';
import { cardName, cardValue, logText, strings } from './strings';
import s from './HamNguc.module.css';
import iconSvg from '../icon.svg?raw';

const modeOptions = (Object.keys(strings.modeOptions) as Mode[]).map((v) => ({ value: v, label: strings.modeOptions[v] }));
const seedOptions = (Object.keys(strings.seedOptions) as SeedMode[]).map((v) => ({ value: v, label: strings.seedOptions[v] }));

/** Chỉ chạy hiệu ứng sau lần vẽ đầu: tải lại giữa ván không diễn lại. */
function useAfterMount() {
  const ready = useRef(false);
  const was = ready.current;
  useEffect(() => {
    ready.current = true;
  }, []);
  return was;
}

function DungeonSettings({ value, onChange, editable }: SettingsProps<DungeonState>) {
  return (
    <SettingsCard editable={editable}>
      <Chips label={strings.modeLabel} options={modeOptions} value={value.mode ?? 'race'} onChange={(mode) => onChange({ mode })} disabled={!editable} />
      <Chips label={strings.seedLabel} options={seedOptions} value={value.seedMode ?? 'daily'} onChange={(seedMode) => onChange({ seedMode })} disabled={!editable} />
    </SettingsCard>
  );
}

function Heroes({ party, view }: { party: DungeonParty; view: number }) {
  const st = party.state!;
  const ready = useAfterMount();
  return (
    <div className={s.heroes}>
      {st.heroes.map((h, i) => {
        const e = expedOf(st, i);
        return (
          <div key={h.id} className={cx(s.hero, !st.done && st.turn === i && s.heroOn, h.status === 'dead' && s.heroDead, view === i && st.mode === 'race' && s.heroView)}>
            <div className={s.heroHead}>
              <Avatar name={party.nameOf(h.id) || '?'} dim={h.status === 'dead'} />
              <span className={s.heroName}>{party.nameOf(h.id)}</span>
            </div>
            <div className={s.hpBar} role="meter" aria-label={strings.hp} aria-valuemin={0} aria-valuemax={MAX_HP} aria-valuenow={h.hp}>
              <span style={{ width: `${(h.hp / MAX_HP) * 100}%` }} />
              <b key={h.hp} className={ready ? s.hpHit : undefined}>{h.hp}</b>
            </div>
            <div className={s.stats}>
              <span title={strings.weapon}>⚔{h.weapon}</span>
              <span title={strings.shield}>◈{h.shield}</span>
              <span title={strings.keys}>⚷{h.keys}</span>
            </div>
            <div className={s.heroFoot}>
              {h.status === 'dead' ? strings.dead : h.status === 'out' ? strings.out : st.mode === 'race' ? strings.where(e.floor + 1, e.row) : ''}
              {st.mode === 'race' && <b>{strings.gold(e.gold)}</b>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DungeonMap({ party, view, canPlay }: { party: DungeonParty; view: number; canPlay: boolean }) {
  const st = party.state!;
  const e = expedOf(st, view);
  const floor = Math.min(e.floor, 2);
  const ready = useAfterMount();
  const next = e.pending || e.row >= ROWS - 1 ? [] : reachable(e);
  const rows = Array.from({ length: ROWS }, (_, i) => ROWS - 1 - i);
  return (
    <div className={s.map} aria-label={strings.floor(floor + 1, strings.floorNames[floor])}>
      <div className={s.mapEdge}>{floor === 2 ? strings.gate(bossPower(st)) : strings.exit}</div>
      {rows.map((r) => (
        <div key={r} className={s.row}>
          {Array.from({ length: COLS }, (_, col) => {
            const id = cellId(floor, r, col);
            const card = st.floors[floor][r * COLS + col];
            const seen = e.seen.includes(id);
            const visited = e.visited.includes(id);
            const here = e.row === r && e.col === col;
            const can = canPlay && r === e.row + 1 && next.includes(col);
            const group = groupOf(card.t);
            return (
              <button
                key={col}
                className={cx(s.cell, seen ? s[group] : s.down, visited && s.visited, here && s.here, can && s.can)}
                disabled={!can}
                onClick={() => party.dispatch({ type: 'step', col })}
                aria-label={seen ? `${strings.groups[group]}: ${cardName(card, floor)} ${cardValue(card)}` : strings.hidden}
              >
                {seen ? (
                  // Ô vừa được lật (khóa đổi từ úp sang ngửa) thì xoay mặt lên.
                  <span key="up" className={cx(s.cardFace, ready && s.flipIn)}>
                    <span className={s.cardName}>{cardName(card, floor)}</span>
                    <span className={s.cardValue}>{cardValue(card)}</span>
                  </span>
                ) : (
                  <span className={s.cardBack} aria-hidden="true">?</span>
                )}
              </button>
            );
          })}
        </div>
      ))}
      <div className={cx(s.mapEdge, e.row < 0 && s.mapEdgeOn)}>{strings.entrance}</div>
    </div>
  );
}

function Choice({ party, view }: { party: DungeonParty; view: number }) {
  const st = party.state!;
  const p = expedOf(st, view).pending;
  if (!p) return null;
  const pick = (option: 'open' | 'skip' | 'heal' | 'torch') => party.dispatch({ type: 'choose', option });
  return (
    <div className={s.choice}>
      <p className={s.choiceTitle}>{p.kind === 'chest' ? strings.chestAsk(p.v) : strings.campAsk}</p>
      <div className={s.choiceRow}>
        {p.kind === 'chest' ? (
          <>
            <Button variant="primary" onClick={() => pick('open')}>{strings.chestOpen}</Button>
            <Button onClick={() => pick('skip')}>{strings.chestSkip}</Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={() => pick('heal')}>{strings.campHeal(st.mode === 'coop')}</Button>
            <Button onClick={() => pick('torch')}>{strings.campTorch}</Button>
          </>
        )}
      </div>
    </div>
  );
}

function Results({ party }: { party: DungeonParty }) {
  const st = party.state!;
  const order = st.heroes.map((_, i) => i).sort((a, b) => scoreOf(st, b) - scoreOf(st, a));
  const best = scoreOf(st, order[0]);
  const title =
    st.mode === 'coop'
      ? st.heroes.some((h) => h.status === 'out')
        ? strings.coopWin
        : strings.coopLose
      : strings.raceWin(order.filter((i) => scoreOf(st, i) === best).map((i) => party.nameOf(st.heroes[i].id)).join(', '));
  return (
    <section className={s.results} aria-label={strings.results}>
      <h3 className={s.resultsTitle} role="status">{title}</h3>
      {st.mode === 'coop' ? (
        <p className={s.resultsLine}>{strings.teamGold(st.expeds[0].gold)}</p>
      ) : (
        <ol className={s.rank}>
          {order.map((i) => (
            <li key={i}>
              <span>{party.nameOf(st.heroes[i].id)}</span>
              <small>{st.heroes[i].status === 'dead' ? strings.dead : strings.out}</small>
              <b>{strings.gold(scoreOf(st, i))}</b>
            </li>
          ))}
        </ol>
      )}
      {party.isHost ? (
        <Button variant="primary" block onClick={() => party.dispatch({ type: 'restart' })}>{strings.newGame}</Button>
      ) : (
        <p className={s.hint}>{strings.waitNewGame}</p>
      )}
    </section>
  );
}

function DungeonGame({ party }: { party: DungeonParty }) {
  const st = party.state!;
  const local = party.mode === 'local';
  const mySeat = st.heroes.findIndex((h) => h.id === party.me);
  const playing = local || mySeat >= 0;
  const myTurn = !st.done && (local || mySeat === st.turn);
  // Đua điểm: xem bản đồ của mình (chơi 1 máy / người xem: của người đang đi). Hợp tác: bản đồ chung.
  const view = st.mode === 'coop' || local || mySeat < 0 ? st.turn : mySeat;
  const e = expedOf(st, view);
  const floor = Math.min(e.floor, 2);
  const turnName = party.nameOf(st.heroes[st.turn]?.id ?? '');

  const sfx = useRef(party.sfx);
  sfx.current = party.sfx;
  const last = st.log[st.log.length - 1];
  const lastN = last?.n ?? 0;
  const lastKind = last?.kind;
  useEffect(() => {
    if (!lastN || !lastKind) return;
    if (lastKind === 'die') {
      sfx.current('buzz');
      vibrate([40, 40, 80]);
    } else if (lastKind === 'escape' || lastKind === 'chestKey' || lastKind === 'chestBreak') sfx.current('win');
    else if (lastKind === 'fight' || lastKind === 'spikes' || lastKind === 'stumble' || lastKind === 'pit' || lastKind === 'boss') {
      sfx.current('tick');
      vibrate(20);
    } else sfx.current('tap');
  }, [lastN, lastKind]);
  useEffect(() => {
    if (st.done) {
      sfx.current('win');
      vibrate([30, 40, 60]);
    }
  }, [st.done]);

  const status = st.done ? '' : !playing ? strings.watching : myTurn ? strings.yourTurn : strings.waitTurn(turnName);
  const gate = !st.done && atGate(e) && !e.pending;

  return (
    <div className={s.game}>
      <div className={s.tags}>
        <span className={s.tag}>{strings.modeOptions[st.mode]}</span>
        <span className={s.tag}>{st.day ? strings.daily(st.day) : strings.randomDungeon}</span>
        {st.mode === 'coop' && <span className={cx(s.tag, s.tagGold)}>{strings.teamGold(st.expeds[0].gold)}</span>}
      </div>
      <Heroes party={party} view={view} />
      {st.done ? (
        <Results party={party} />
      ) : (
        <>
          <div className={s.head}>
            <span className={s.status} aria-live="polite">{status}</span>
          </div>
          <div className={s.floorBar}>
            <span>{strings.floor(floor + 1, strings.floorNames[floor])}</span>
            <span className={cx(s.torch, e.torch === 0 && s.torchOut)}>{strings.torch(e.torch)}</span>
          </div>
          {st.mode === 'race' && !local && view !== mySeat && <p className={s.hint}>{strings.viewing(party.nameOf(st.heroes[view].id))}</p>}
          {myTurn && <Choice party={party} view={view} />}
          {myTurn && gate && (
            <Button variant="primary" block onClick={() => party.dispatch({ type: 'step', col: 0 })}>{strings.fightBoss}</Button>
          )}
          <DungeonMap party={party} view={view} canPlay={myTurn && !gate} />
        </>
      )}
      {st.log.length > 0 && (
        <section className={s.log} aria-label={strings.log}>
          <ul>
            {st.log
              .slice(-6)
              .reverse()
              .map((l) => (
                <li key={l.n}>{logText(l, (i) => party.nameOf(st.heroes[i]?.id ?? ''))}</li>
              ))}
          </ul>
        </section>
      )}
      <details className={s.rules}>
        <summary>{strings.rulesTitle}</summary>
        <p>{strings.rule}</p>
      </details>
    </div>
  );
}

export default function HamNguc({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(dungeonGame, ctx);
  return (
    <PartyShell
      party={party}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span className={s.heroArt} dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <DungeonSettings {...p} />,
      }}
    >
      {party.state && <DungeonGame party={party} />}
    </PartyShell>
  );
}

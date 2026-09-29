import { Avatar } from '@bang/party';
import { cx } from '@bang/ui';
import { getFinals, leaders, type FishParty } from './game';
import { strings } from './strings';
import s from './Fish.module.css';

/* ---------- Bốc thăm ---------- */

export function Lots({ party }: { party: FishParty }) {
  const punish = party.state!.punish!;
  const finals = getFinals(party.state!);
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
                {open && <span className={s.lotFace}>{finals[penalty]?.short ?? strings.finals[penalty]?.short}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}

/* ---------- Điểm ---------- */

export function Scores({ party, final }: { party: FishParty; final?: boolean }) {
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

export function WinnerBanner({ party }: { party: FishParty }) {
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

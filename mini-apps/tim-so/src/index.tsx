import { useEffect, useRef } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { PartyShell, useParty, type PartyData } from '@bang/party';
import { Button, Icon, cx } from '@bang/ui';
import { findGame, type FindParty } from './game';
import { strings } from './strings';
import { useLook } from './look';
import { FindArt, LookContext, PreviewBoard } from './board';
import { useRewrite, type Rewrite } from './rewrite';
import { RoundView } from './RoundView';
import { FindSettings } from './Settings';
import s from './Find.module.css';

function Setup({ party, anim }: { party: FindParty; anim: Rewrite | null }) {
  const state = party.state!;
  const { dispatch } = party;
  const race = state.play === 'race';
  const host = party.isHost;
  const busy = !!anim;
  const canStart = (race ? host : party.myTurn) && !busy;
  const inGame = party.mode === 'local' || party.players.some((p) => p.id === party.me);
  return (
    <div className={s.setup}>
      <p className={s.idleText}>{race ? strings.readyRace : strings.readyTurn(party.current?.name ?? '', state.turnSeconds, state.penalty)}</p>

      <section className={s.previewBox} aria-label={strings.preview}>
        <div className={s.previewHead}>
          <span className={s.previewTitle} aria-live="polite">{busy ? strings.shuffling : strings.preview}</span>
          <div className={s.previewActions}>
            {inGame && (
              <button className={s.shuffleButton} disabled={busy} onClick={() => dispatch({ type: 'shuffle' })}>
                <Icon name="shuffle" size={18} /> {strings.shuffle}
              </button>
            )}
          </div>
        </div>
        <PreviewBoard dots={state.dots} anim={anim} />
      </section>

      {(race ? host : party.myTurn) ? (
        <Button variant="primary" block className={s.cta} disabled={!canStart} onClick={() => dispatch({ type: 'start' })}>
          {strings.start}
        </Button>
      ) : (
        <p className={s.wait}>{race ? strings.waitStart : strings.waitTurn(party.current?.name ?? '')}</p>
      )}
      <Scoreboard party={party} />
    </div>
  );
}

function Scoreboard({ party }: { party: FindParty }) {
  const { scores, wins, play } = party.state!;
  const rows = party.players.map((p) => ({ p, n: scores[p.id] ?? 0, w: wins[p.id] ?? 0 })).sort((a, b) => b.w - a.w || b.n - a.n);
  if (!rows.some((r) => r.n > 0)) return null;
  return (
    <section className={s.scores} aria-label={strings.scoreboard}>
      <h3 className={s.scoresTitle}>{strings.scoreboard}</h3>
      <ol className={s.scoreList}>
        {rows.map(({ p, n, w }, i) => (
          <li key={p.id} className={cx(s.scoreRow, i === 0 && s.leader)}>
            <span className={s.rank}>{i + 1}</span>
            <span className={s.scoreName}>{p.name}</span>
            {play === 'race' && w > 0 && <span className={s.winTag}>{strings.wins(w)}</span>}
            <span className={s.points}>{strings.points(n)}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function FindGame({ party }: { party: FindParty }) {
  const state = party.state!;
  const { dispatch, mode } = party;
  // Chơi 1 máy thì không thể tìm cùng lúc: chuyền tay nhau từng lượt.
  const wantPlay = mode === 'local' ? 'turns' : null;
  useEffect(() => {
    if (wantPlay && state.play !== wantPlay && !state.round) dispatch({ type: 'config', config: { play: wantPlay } });
  }, [wantPlay, state.play, state.round, dispatch]);

  // Hiệu ứng viết lại sống ở đây để còn nhớ bàn cũ khi từ vòng chơi quay về màn chờ.
  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  const anim = useRewrite(state.dots, state.shuffles, (tone) => sfxRef.current(tone));

  return state.round ? <RoundView party={party} round={state.round} /> : <Setup party={party} anim={anim} />;
}

export default function TimSo({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(findGame, ctx);
  const [look, update] = useLook();
  return (
    <LookContext.Provider value={{ look, update }}>
      <PartyShell party={party} together={party.state?.play === 'race'} info={{ title: strings.title, rule: strings.rule, art: <FindArt />, settings: (p) => <FindSettings {...p} /> }}>
        {party.state && <FindGame party={party} />}
      </PartyShell>
    </LookContext.Provider>
  );
}

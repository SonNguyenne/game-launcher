import { useEffect, useRef } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import { Chips, PartyShell, ResultCard, SettingsCard, playerAt, useParty, vibrate, type Party, type PartyData } from '@bang/party';
import { Button, cx } from '@bang/ui';
import { tdGame, type TdAction, type TdState } from './game';
import { strings, type Kind, type Level } from './strings';
import s from './TruthDare.module.css';

const kinds = Object.keys(strings.kinds) as Kind[];
const levelOptions = (Object.keys(strings.levels) as Level[]).map((v) => ({ value: v, label: strings.levels[v] }));

export function TruthDareArt() {
  return (
    <div className={s.art}>
      <span className={cx(s.artCard, s.truth)}>{strings.kinds.truth.name}</span>
      <span className={cx(s.artCard, s.dare)}>{strings.kinds.dare.name}</span>
    </div>
  );
}

function TruthDareGame({ party }: { party: Party<TdState, TdAction> }) {
  const state = party.state!;
  const card = state.card;
  const next = playerAt(party.players, state.turn + 1)?.name ?? '';
  const name = party.current?.name ?? '';

  const sfxRef = useRef(party.sfx);
  sfxRef.current = party.sfx;
  const cardId = card?.id ?? 0;
  useEffect(() => {
    if (!cardId) return;
    sfxRef.current('tap');
    vibrate(15);
  }, [cardId]);
  const resultSeq = state.result?.seq;
  useEffect(() => {
    if (resultSeq) sfxRef.current('buzz');
  }, [resultSeq]);


  if (!card) {
    return (
      <div className={s.game}>
        <p className={s.prompt}>{party.myTurn ? strings.choose : strings.waitChoose(name)}</p>
        <div className={s.choices}>
          {kinds.map((k) => (
            <button key={k} className={cx(s.choice, s[k])} disabled={!party.myTurn} onClick={() => party.dispatch({ type: 'pick', kind: k })}>
              <span className={s.choiceName}>{strings.kinds[k].name}</span>
              <span className={s.choiceHint}>{strings.kinds[k].hint}</span>
            </button>
          ))}
        </div>
        <button className={s.random} disabled={!party.myTurn} onClick={() => party.dispatch({ type: 'pick', kind: 'random' })}>
          <span className={s.dice} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            <strong>{strings.random}</strong>
            <small>{strings.randomHint}</small>
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={s.game}>
      {/* Lá bài úp rồi lật ra; mỗi lần rút hoặc đổi câu là một lá mới. */}
      <div key={card.id} className={s.flipper} aria-live="polite">
        <div className={cx(s.face, s.back, s[`${card.kind}Back`])} aria-hidden="true">
          <span>{strings.kinds[card.kind].name}</span>
        </div>
        <article className={cx(s.face, s.front, s[`${card.kind}Card`])}>
          <div className={s.tags}>
            <span className={cx(s.kind, s[card.kind])}>{strings.kinds[card.kind].name}</span>
            {card.random && <span className={s.tag}>{strings.byMachine}</span>}
            <span className={s.tag}>{strings.levels[state.level]}</span>
          </div>
          <p className={s.text}>{card.text}</p>
        </article>
      </div>
      <div className={s.actions}>
        <Button variant="primary" block disabled={!party.myTurn && !party.isHost} onClick={() => party.dispatch({ type: 'done' })}>
          {strings.done(next)}
        </Button>
        {party.myTurn && (
          <div className={s.secondary}>
            <Button disabled={state.swapped} onClick={() => party.dispatch({ type: 'swap' })}>
              {state.swapped ? strings.swapUsed : strings.swap}
            </Button>
            <Button onClick={() => party.dispatch({ type: 'refuse' })}>{strings.refuse(strings.penalty[state.level])}</Button>
          </div>
        )}
      </div>
      <ResultCard party={party} />
    </div>
  );
}

export default function ThatHayThach({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(tdGame, ctx);
  return (
    <PartyShell party={party} info={{
        title: strings.title,
        rule: strings.rule,
        art: <TruthDareArt />,
        settings: ({ value, onChange, editable }) => (
          <SettingsCard editable={editable}>
            <Chips label={strings.levelLabel} options={levelOptions} value={value.level ?? 'vui'} disabled={!editable} onChange={(level) => onChange({ level })} />
          </SettingsCard>
        ),
      }}>
      {party.state && <TruthDareGame party={party} />}
    </PartyShell>
  );
}

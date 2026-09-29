import { useEffect, useRef } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import {
  Chips,
  PartyShell,
  ResultCard,
  SettingsCard,
  useParty,
  vibrate,
  type Party,
  type PartyData,
} from '@bang/party';
import { Button, Field, TextInput, cx } from '@bang/ui';
import {
  dapTayGame,
  pickRandomCard,
  speedToMs,
  type DapTayAction,
  type DapTayConfig,
  type DapTayState,
} from './game';
import { rulePresets, strings, type Speed } from './strings';
import s from './DapTay.module.css';
import iconSvg from '../icon.svg?raw';

const speedOptions = (Object.keys(strings.speeds) as Speed[]).map((v) => ({
  value: v,
  label: strings.speeds[v],
}));

function DapTaySettings({
  value,
  onChange,
  editable,
}: {
  value: DapTayConfig;
  onChange: (patch: DapTayConfig) => void;
  editable: boolean;
}) {
  const currentSpeed = value.speed ?? 'nhanh';
  const currentPen = value.penaltyText?.trim() || strings.defaultPenalty;

  return (
    <SettingsCard editable={editable}>
      <Chips
        label={strings.speedLabel}
        options={speedOptions}
        value={currentSpeed}
        disabled={!editable}
        onChange={(speed) => onChange({ ...value, speed })}
      />

      <Field
        label={strings.penaltyLabel}
        htmlFor="daptay-penalty"
        hint="Hình phạt cho người đập nhầm hoặc chậm tay nhất (tự lưu)."
      >
        <TextInput
          id="daptay-penalty"
          value={value.penaltyText ?? ''}
          placeholder={strings.defaultPenalty}
          maxLength={60}
          disabled={!editable}
          onChange={(e) => onChange({ ...value, penaltyText: e.target.value })}
        />
      </Field>

      {editable && (
        <div className={s.presetSection}>
          <span className={s.presetLabel}>Gợi ý nhanh:</span>
          <div className={s.presetChips}>
            {strings.penaltyPresets.map((preset) => {
              const active = currentPen === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  className={cx(s.presetChip, active && s.presetChipActive)}
                  onClick={() => onChange({ ...value, penaltyText: preset })}
                >
                  {preset}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </SettingsCard>
  );
}

function DapTayGame({ party }: { party: Party<DapTayState, DapTayAction> }) {
  const st = party.state!;
  const preset = rulePresets[st.ruleIndex] ?? rulePresets[0];
  const isRunning = st.phase === 'running';
  const isSlapped = st.phase === 'slapped';
  const currentCard = st.currentCard;

  const cardRef = useRef(currentCard);
  cardRef.current = currentCard;

  // Host chạy vòng lặp lật thẻ bài
  useEffect(() => {
    if (!isRunning || !party.isHost) return;
    const interval = speedToMs(st.speed);

    // Lật ngay thẻ đầu tiên
    const first = pickRandomCard(preset, 0, st.targetArrival);
    party.dispatch({ type: 'flip_card', card: first });

    let count = 0;
    const timer = setInterval(() => {
      count += 1;
      const nextCard = pickRandomCard(preset, count, st.targetArrival);
      party.dispatch({ type: 'flip_card', card: nextCard });
      party.sfx('tick');
    }, interval);

    return () => clearInterval(timer);
  }, [isRunning, party.isHost, st.speed, st.targetArrival, preset, party]);

  // Handle slap
  const handleSlap = () => {
    if (!isRunning) return;
    const card = cardRef.current;
    if (!card) {
      party.dispatch({ type: 'slap', outcome: 'wrong' });
      party.sfx('buzz');
      vibrate(100);
      return;
    }

    if (card.id === preset.targetId) {
      party.dispatch({ type: 'slap', outcome: 'success' });
      party.sfx('win');
      vibrate([60, 80]);
    } else if (preset.trapId && card.id === preset.trapId) {
      party.dispatch({ type: 'slap', outcome: 'trap' });
      party.sfx('buzz');
      vibrate([100, 100]);
    } else {
      party.dispatch({ type: 'slap', outcome: 'wrong' });
      party.sfx('buzz');
      vibrate(100);
    }
  };

  const slapper = isSlapped && st.slapperId
    ? party.players.find((p) => p.id === st.slapperId)
    : null;
  const slapperName = slapper?.name ?? 'Bạn';

  return (
    <div className={s.game}>
      <div className={s.centerBox}>
        <div className={s.ruleBadge}>
          <span>{preset.desc}</span>
        </div>

        {st.phase === 'ready' && (
          <div className={s.targetCard}>
            <span className={s.targetText}>🎯 {strings.readyTitle} 🎯</span>
            <p className={s.targetText} style={{ color: 'var(--accent)' }}>
              {preset.desc}
            </p>
            <p className={s.targetText} style={{ fontSize: 'var(--fs-sm)', color: 'var(--ink-secondary)' }}>
              {strings.waitSlap}
            </p>
          </div>
        )}

        {(isRunning || isSlapped) && (
          <>
            <div className={s.cardStage}>
              {currentCard ? (
                <>
                  <span className={s.cardEmoji}>{currentCard.emoji}</span>
                  <span className={s.cardLabel}>{currentCard.name}</span>
                </>
              ) : (
                <span className={s.cardLabel}>Sẵn sàng…</span>
              )}
            </div>

            {isRunning && (
              <button
                type="button"
                className={s.slapBtn}
                onClick={handleSlap}
              >
                {strings.slapButton}
              </button>
            )}
          </>
        )}

        {isSlapped && (
          <div
            className={cx(
              s.outcomeBanner,
              st.slapOutcome === 'success' ? s.outcomeSuccess : s.outcomeTrap,
            )}
          >
            <h3 className={s.outcomeTitle}>
              {st.slapOutcome === 'success'
                ? strings.slapSuccess(slapperName)
                : st.slapOutcome === 'trap'
                  ? strings.slapTrap(slapperName)
                  : strings.slapWrong(slapperName)}
            </h3>
            <p className={s.outcomeDesc}>
              {st.slapOutcome === 'success'
                ? `Những người đập chậm: ${st.penaltyText?.trim() || strings.defaultPenalty}`
                : `${slapperName}: ${st.penaltyText?.trim() || strings.defaultPenalty}`}
            </p>
          </div>
        )}
      </div>

      <div className={s.actions}>
        {st.phase === 'ready' && party.isHost && (
          <Button
            variant="primary"
            block
            onClick={() => party.dispatch({ type: 'start_round' })}
          >
            {strings.startFlipping}
          </Button>
        )}

        {isSlapped && party.isHost && (
          <Button
            variant="primary"
            block
            onClick={() => party.dispatch({ type: 'next_round' })}
          >
            {strings.nextRound}
          </Button>
        )}
      </div>

      <ResultCard party={party} />
    </div>
  );
}

export default function DapTay({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(dapTayGame, ctx);

  return (
    <PartyShell
      party={party}
      together={true}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <DapTaySettings {...p} />,
      }}
    >
      {party.state && <DapTayGame party={party} />}
    </PartyShell>
  );
}

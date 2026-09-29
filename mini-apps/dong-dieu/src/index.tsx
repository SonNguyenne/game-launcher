import { useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import {
  Avatar,
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
  dongDieuGame,
  type DongDieuAction,
  type DongDieuConfig,
  type DongDieuState,
} from './game';
import { prompts, strings } from './strings';
import s from './DongDieu.module.css';
import iconSvg from '../icon.svg?raw';

function DongDieuSettings({
  value,
  onChange,
  editable,
}: {
  value: DongDieuConfig;
  onChange: (patch: DongDieuConfig) => void;
  editable: boolean;
}) {
  const currentPen = value.penaltyText?.trim() || strings.defaultPenalty;

  return (
    <SettingsCard editable={editable}>
      <Field
        label={strings.penaltyLabel}
        htmlFor="dongdieu-penalty"
        hint="Hình phạt dành cho 2 người khi đưa ra đáp án lệch pha (tự lưu)."
      >
        <TextInput
          id="dongdieu-penalty"
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

function DongDieuGame({ party }: { party: Party<DongDieuState, DongDieuAction> }) {
  const st = party.state!;
  const promptItem = prompts[st.pIndex] ?? prompts[0];
  const [id1, id2] = st.pairIds ?? ['p1', 'p2'];
  const p1 = party.players.find((p) => p.id === id1);
  const p2 = party.players.find((p) => p.id === id2);
  const name1 = p1?.name ?? 'Người 1';
  const name2 = p2?.name ?? 'Người 2';
  const isLocal = party.mode === 'local';
  const isInPair = party.me === id1 || party.me === id2;

  // Local inputs
  const [localA1, setLocalA1] = useState('');
  const [localA2, setLocalA2] = useState('');

  // Online input
  const [myAnswer, setMyAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const answer1 = st.answers[id1] ?? '';
  const answer2 = st.answers[id2] ?? '';
  const isMatched = st.isMatched;

  return (
    <div className={s.game}>
      <div className={s.centerBox}>
        {/* Pair banner */}
        <div className={s.pairHeader}>
          <div className={s.playerCard}>
            <Avatar name={name1} />
            <span className={s.playerName}>{name1}</span>
          </div>
          <div className={s.vsSpark}>⚡</div>
          <div className={s.playerCard}>
            <Avatar name={name2} />
            <span className={s.playerName}>{name2}</span>
          </div>
        </div>

        <div className={s.categoryTag}>
          <span>{promptItem.category}</span>
        </div>

        {/* Prompt Card */}
        <div className={s.promptCard}>
          <p className={s.promptText}>"{promptItem.p}"</p>
        </div>

        {/* Phase 1: Pair Pick */}
        {st.phase === 'pair_pick' && (
          <p className={s.hintText}>
            2 bạn đã sẵn sàng kết nối não chưa? Bấm bắt đầu để cùng nhập đáp án!
          </p>
        )}

        {/* Phase 2: Typing (Local 1 máy) */}
        {st.phase === 'typing' && isLocal && (
          <div className={s.typingBox}>
            <Field label={`Đáp án của ${name1}:`} htmlFor="local-a1">
              <TextInput
                id="local-a1"
                value={localA1}
                maxLength={40}
                placeholder={strings.answerPlaceholder}
                onChange={(e) => setLocalA1(e.target.value)}
              />
            </Field>

            <Field label={`Đáp án của ${name2}:`} htmlFor="local-a2">
              <TextInput
                id="local-a2"
                value={localA2}
                maxLength={40}
                placeholder={strings.answerPlaceholder}
                onChange={(e) => setLocalA2(e.target.value)}
              />
            </Field>
          </div>
        )}

        {/* Phase 2: Typing (Online) */}
        {st.phase === 'typing' && !isLocal && (
          <>
            {isInPair && !submitted && (
              <div className={s.typingBox}>
                <Field label={strings.typeYourAnswer} htmlFor="my-answer">
                  <TextInput
                    id="my-answer"
                    value={myAnswer}
                    maxLength={40}
                    placeholder={strings.answerPlaceholder}
                    onChange={(e) => setMyAnswer(e.target.value)}
                  />
                </Field>
                <Button
                  variant="primary"
                  block
                  disabled={!myAnswer.trim()}
                  onClick={() => {
                    party.dispatch({ type: 'submit_answer', answer: myAnswer.trim() });
                    setSubmitted(true);
                  }}
                >
                  {strings.submitAnswer}
                </Button>
              </div>
            )}

            {isInPair && submitted && (
              <div className={s.waitingPill}>
                <span>✓ {strings.waitingPartner}</span>
              </div>
            )}

            {!isInPair && (
              <div className={s.waitingPill}>
                <span>{strings.typingWait(`${name1} & ${name2}`)}</span>
              </div>
            )}
          </>
        )}

        {/* Phase 3: Revealed */}
        {st.phase === 'revealed' && (
          <>
            <div className={s.revealGrid}>
              <div className={s.answerCard}>
                <span className={s.answerLabel}>{name1}</span>
                <span className={s.answerValue}>{answer1 || '---'}</span>
              </div>
              <div className={s.answerCard}>
                <span className={s.answerLabel}>{name2}</span>
                <span className={s.answerValue}>{answer2 || '---'}</span>
              </div>
            </div>

            <div
              className={cx(
                s.statusBanner,
                isMatched ? s.statusMatched : s.statusMismatch,
              )}
            >
              <h3 className={s.statusTitle}>
                {isMatched ? strings.matchedTitle : strings.mismatchTitle}
              </h3>
              <p className={s.statusDesc}>
                {isMatched
                  ? strings.matchedDesc
                  : `${st.penaltyText?.trim() || strings.defaultPenalty}`}
              </p>
            </div>

            {party.isHost && (
              <div className={s.judgeBar}>
                <Button
                  onClick={() => {
                    party.dispatch({ type: 'judge', matched: true });
                    party.sfx('win');
                    vibrate([50, 80]);
                  }}
                >
                  ✓ {strings.judgeMatch}
                </Button>
                <Button
                  onClick={() => {
                    party.dispatch({ type: 'judge', matched: false });
                    party.sfx('buzz');
                    vibrate(100);
                  }}
                >
                  ✕ {strings.judgeMismatch}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Action buttons */}
      <div className={s.actions}>
        {st.phase === 'pair_pick' && (
          <Button
            variant="primary"
            block
            onClick={() => {
              setLocalA1('');
              setLocalA2('');
              setMyAnswer('');
              setSubmitted(false);
              party.dispatch({ type: 'start_typing' });
            }}
          >
            Bắt đầu đoán ý!
          </Button>
        )}

        {st.phase === 'typing' && isLocal && (
          <Button
            variant="primary"
            block
            disabled={!localA1.trim() || !localA2.trim()}
            onClick={() => {
              party.dispatch({
                type: 'submit_local_answers',
                a1: localA1.trim(),
                a2: localA2.trim(),
              });
            }}
          >
            {strings.revealButton}
          </Button>
        )}

        {st.phase === 'revealed' && party.isHost && (
          <Button
            variant="primary"
            block
            onClick={() => {
              setLocalA1('');
              setLocalA2('');
              setMyAnswer('');
              setSubmitted(false);
              party.dispatch({ type: 'next_round' });
            }}
          >
            {strings.nextRound}
          </Button>
        )}
      </div>

      <ResultCard party={party} />
    </div>
  );
}

export default function DongDieu({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(dongDieuGame, ctx);

  return (
    <PartyShell
      party={party}
      together={true}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <DongDieuSettings {...p} />,
      }}
    >
      {party.state && <DongDieuGame party={party} />}
    </PartyShell>
  );
}

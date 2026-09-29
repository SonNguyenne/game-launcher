import { useEffect, useState } from 'react';
import type { MiniAppProps } from '@bang/sdk';
import {
  Avatar,
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
  chiTayGame,
  type ChiTayAction,
  type ChiTayConfig,
  type ChiTayState,
} from './game';
import { questions, strings, type Topic } from './strings';
import s from './ChiTay.module.css';
import iconSvg from '../icon.svg?raw';

const topicOptions = (Object.keys(strings.topics) as Topic[]).map((v) => ({
  value: v,
  label: strings.topics[v],
}));

function ChiTaySettings({
  value,
  onChange,
  editable,
}: {
  value: ChiTayConfig;
  onChange: (patch: ChiTayConfig) => void;
  editable: boolean;
}) {
  const currentTopic = value.topic ?? 'mix';
  const currentPen = value.penaltyText?.trim() || strings.defaultPenalty;

  return (
    <SettingsCard editable={editable}>
      <Chips
        label={strings.topicLabel}
        options={topicOptions}
        value={currentTopic}
        disabled={!editable}
        onChange={(topic) => onChange({ ...value, topic })}
      />

      <Field
        label={strings.penaltyLabel}
        htmlFor="chitay-penalty"
        hint="Nội dung phạt dành cho người bị chỉ tay nhiều nhất (tự lưu)."
      >
        <TextInput
          id="chitay-penalty"
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

function ChiTayGame({ party }: { party: Party<ChiTayState, ChiTayAction> }) {
  const st = party.state!;
  const q = questions[st.qIndex]?.q ?? 'Ai là người hài hước nhất?';
  const currentTopic = questions[st.qIndex]?.topic ?? 'bua';
  const isLocal = party.mode === 'local';
  const [localSeconds, setLocalSeconds] = useState<number | null>(null);

  // Local countdown
  const startLocalCountdown = () => {
    setLocalSeconds(3);
    party.sfx('tick');
    vibrate(50);
  };

  useEffect(() => {
    if (localSeconds === null) return;
    if (localSeconds > 1) {
      const id = setTimeout(() => {
        setLocalSeconds(localSeconds - 1);
        party.sfx('tick');
        vibrate(50);
      }, 1000);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => {
      setLocalSeconds(0);
      party.sfx('win');
      vibrate([80, 100]);
    }, 1000);
    return () => clearTimeout(id);
  }, [localSeconds, party]);

  const votes = st.votes;
  const votedCount = Object.keys(votes).length;
  const myVote = votes[party.me];

  // Tính phiếu trong phase revealed
  const voteTally: Record<string, number> = {};
  for (const tid of Object.values(votes)) {
    voteTally[tid] = (voteTally[tid] ?? 0) + 1;
  }

  return (
    <div className={s.game}>
      <div className={s.centerBox}>
        <div className={s.topicTag}>
          <span>{strings.topics[currentTopic] ?? currentTopic}</span>
        </div>

        <div className={s.questionCard}>
          <p className={s.questionText}>"{q}"</p>
        </div>

        {st.phase === 'question' && (
          <p className={s.votePrompt}>Đọc câu hỏi cho cả bàn cùng chuẩn bị tinh thần!</p>
        )}

        {st.phase === 'voting' && isLocal && (
          <>
            {localSeconds === null && (
              <p className={s.votePrompt}>Bấm để đếm ngược 3 giây, sau đó cả bàn cùng chỉ tay!</p>
            )}
            {localSeconds !== null && localSeconds > 0 && (
              <div className={s.countdownBadge}>{localSeconds}</div>
            )}
            {localSeconds === 0 && (
              <>
                <div className={s.pointText}>{strings.pointNow}</div>
                <p className={s.votePrompt}>{strings.whoVoted}</p>
                <div className={s.voteGrid}>
                  {party.players.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={s.voteBtn}
                      onClick={() => party.dispatch({ type: 'confirm_local', victimId: p.id })}
                    >
                      <Avatar name={p.name} />
                      <span className={s.voteBtnName}>{p.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {st.phase === 'voting' && !isLocal && (
          <>
            <p className={s.votePrompt}>{strings.votingOnline}</p>
            <div className={s.voteGrid}>
              {party.players.map((p) => {
                const isSelected = myVote === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className={cx(s.voteBtn, isSelected && s.voteBtnActive)}
                    onClick={() => party.dispatch({ type: 'vote', targetId: p.id })}
                  >
                    <Avatar name={p.name} />
                    <span className={s.voteBtnName}>{p.name}</span>
                    {isSelected && <span className={s.voteCount}>Đã chọn ✓</span>}
                  </button>
                );
              })}
            </div>
            <p className={s.voteCount}>{strings.waitingVotes(votedCount, party.players.length)}</p>
          </>
        )}

        {st.phase === 'revealed' && (
          <div className={s.victimCard}>
            <span className={s.victimPill}>{strings.victimBadge}</span>
            <h3 className={s.victimName}>
              {st.victimIds.map((id) => party.nameOf(id) || id).join(', ')}
            </h3>
            <p className={s.victimPenalty}>
              {st.penaltyText?.trim() || strings.defaultPenalty}
            </p>

            {!isLocal && (
              <div className={s.presetChips} style={{ marginTop: 'var(--space-2)' }}>
                {party.players.map((p) => {
                  const count = voteTally[p.id] ?? 0;
                  return (
                    <span key={p.id} className={s.presetChip}>
                      {p.name}: {strings.votesCount(count)}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className={s.actions}>
        {st.phase === 'question' && (
          <Button
            variant="primary"
            block
            onClick={() => {
              if (isLocal) {
                party.dispatch({ type: 'ready' });
                startLocalCountdown();
              } else {
                party.dispatch({ type: 'ready' });
              }
            }}
          >
            {strings.readyVote}
          </Button>
        )}

        {st.phase === 'voting' && isLocal && localSeconds === null && (
          <Button variant="primary" block onClick={startLocalCountdown}>
            Đếm ngược chỉ tay!
          </Button>
        )}

        {st.phase === 'revealed' && party.isHost && (
          <Button
            variant="primary"
            block
            onClick={() => {
              setLocalSeconds(null);
              party.dispatch({ type: 'next_question' });
            }}
          >
            {strings.nextQuestion}
          </Button>
        )}
      </div>

      <ResultCard party={party} />
    </div>
  );
}

export default function ChiTay({ ctx }: MiniAppProps<PartyData>) {
  const party = useParty(chiTayGame, ctx);

  return (
    <PartyShell
      party={party}
      together={true}
      info={{
        title: strings.title,
        rule: strings.rule,
        art: <span dangerouslySetInnerHTML={{ __html: iconSvg }} />,
        settings: (p) => <ChiTaySettings {...p} />,
      }}
    >
      {party.state && <ChiTayGame party={party} />}
    </PartyShell>
  );
}

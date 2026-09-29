import { useEffect, useState } from 'react';
import { Chips, partyStyles } from '@bang/party';
import { Button, Icon, Sheet, TextInput, cx } from '@bang/ui';
import { LIMITS, SECONDS, SIZES, TURN_SECONDS, type Config } from './game';
import { strings, type Order, type Play } from './strings';
import { useLookContext } from './board';
import s from './Find.module.css';

const orderOptions = (Object.keys(strings.orders) as Order[]).map((v) => ({ value: v, label: strings.orders[v] }));
const playOptions = (Object.keys(strings.plays) as Play[]).map((v) => ({ value: v, label: strings.plays[v] }));
const sizeOptions = SIZES.map((n) => ({ value: String(n), label: strings.size(n) }));
const secondOptions = SECONDS.map((n) => ({ value: String(n), label: strings.seconds(n) }));
const turnSecondOptions = TURN_SECONDS.map((n) => ({ value: String(n), label: strings.seconds(n) }));
const penaltyOptions = (['on', 'off'] as const).map((v) => ({ value: v, label: strings.penaltyOptions[v] }));

/** Ô nhập số tùy ý; áp dụng khi rời ô hoặc bấm Enter, số ngoài khoảng bị kéo về giới hạn gần nhất. */
function NumberInput({ value, min, max, label, hint, onCommit }: { value: number; min: number; max: number; label: string; hint: string; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  const commit = () => {
    const n = Number.parseInt(draft, 10);
    if (Number.isNaN(n)) return setDraft(String(value));
    const clamped = Math.min(max, Math.max(min, n));
    setDraft(String(clamped));
    if (clamped !== value) onCommit(clamped);
  };
  return (
    <label className={s.custom}>
      <span className={s.customLabel}>{label}</span>
      <TextInput
        className={s.customInput}
        value={draft}
        inputMode="numeric"
        enterKeyHint="done"
        maxLength={3}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onBlur={commit}
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      />
      <span className={s.customHint}>{hint}</span>
    </label>
  );
}

type FindConfig = Required<Config>;

function SettingsSheet({ value: state, onChange: config, online, open, onClose }: { value: FindConfig; onChange: (c: Config) => void; online: boolean; open: boolean; onClose: () => void }) {
  const race = state.play === 'race';
  return (
    <Sheet open={open} title={strings.settingsTitle} closeLabel={strings.settingsDone} onClose={onClose}>
      <div className={s.settings}>
        <Chips label={strings.orderLabel} options={orderOptions} value={state.order} onChange={(order) => config({ order })} />
        {online && <Chips label={strings.playLabel} options={playOptions} value={state.play} onChange={(play) => config({ play })} />}

        <section className={s.group}>
          <Chips label={strings.sizeLabel} options={sizeOptions} value={String(state.size)} onChange={(v) => config({ size: Number(v) })} />
          <NumberInput
            value={state.size}
            {...LIMITS.size}
            label={strings.custom}
            hint={strings.sizeRange(LIMITS.size.min, LIMITS.size.max)}
            onCommit={(size) => config({ size })}
          />
        </section>

        {race ? (
          <section className={s.group}>
            <Chips label={strings.secondsLabel} options={secondOptions} value={String(state.seconds)} onChange={(v) => config({ seconds: Number(v) })} />
            <NumberInput
              value={state.seconds}
              {...LIMITS.seconds}
              label={strings.custom}
              hint={strings.secondsRange(LIMITS.seconds.min, LIMITS.seconds.max)}
              onCommit={(seconds) => config({ seconds })}
            />
          </section>
        ) : (
          <>
            <section className={s.group}>
              <Chips
                label={strings.turnSecondsLabel}
                options={turnSecondOptions}
                value={String(state.turnSeconds)}
                onChange={(v) => config({ turnSeconds: Number(v) })}
              />
              <NumberInput
                value={state.turnSeconds}
                {...LIMITS.turnSeconds}
                label={strings.custom}
                hint={strings.secondsRange(LIMITS.turnSeconds.min, LIMITS.turnSeconds.max)}
                onCommit={(turnSeconds) => config({ turnSeconds })}
              />
            </section>
            <Chips
              label={strings.penaltyLabel}
              options={penaltyOptions}
              value={state.penalty ? 'on' : 'off'}
              onChange={(v) => config({ penalty: v === 'on' })}
            />
          </>
        )}

        <Button variant="primary" block onClick={onClose}>{strings.settingsDone}</Button>
      </div>
    </Sheet>
  );
}

function LookSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { look, update } = useLookContext();
  const opts = <K extends string>(labels: Record<K, string>) => (Object.keys(labels) as K[]).map((v) => ({ value: v, label: labels[v] }));
  return (
    <Sheet open={open} title={strings.lookTitle} closeLabel={strings.settingsDone} onClose={onClose}>
      <div className={s.settings}>
        <p className={s.summaryHint}>{strings.lookHint}</p>
        <Chips label={strings.lookColor} options={opts(strings.lookColors)} value={look.color} onChange={(color) => update({ color })} />
        <Chips label={strings.lookFont} options={opts(strings.lookFonts)} value={look.font} onChange={(font) => update({ font })} />
        <Chips label={strings.lookScale} options={opts(strings.lookScales)} value={look.scale} onChange={(scale) => update({ scale })} />
        <Chips label={strings.lookTilt} options={opts(strings.lookTilts)} value={look.tilt ? 'on' : 'off'} onChange={(v) => update({ tilt: v === 'on' })} />
        <Button variant="primary" block onClick={onClose}>{strings.settingsDone}</Button>
      </div>
    </Sheet>
  );
}

/** Cài đặt ở phòng chờ: tóm tắt + nút mở bảng chỉnh (chủ phòng), và giao diện riêng của từng máy. */
export function FindSettings({ value, onChange, editable, online }: { value: Config; onChange: (c: Config) => void; editable: boolean; online: boolean }) {
  const [open, setOpen] = useState(false);
  const [lookOpen, setLookOpen] = useState(false);
  // Phòng chờ đã gộp mặc định; chơi 1 máy luôn là chơi lần lượt.
  const state = { ...value, ...(online ? {} : { play: 'turns' }) } as FindConfig;
  const race = state.play === 'race';
  const summary = [
    { label: strings.orderLabel, value: strings.orders[state.order] },
    { label: strings.sizeLabel, value: strings.size(state.size) },
    race
      ? { label: strings.secondsLabel, value: strings.seconds(state.seconds) }
      : { label: strings.turnSecondsLabel, value: strings.seconds(state.turnSeconds) },
    ...(race ? [] : [{ label: strings.penaltyLabel, value: strings.penaltyOptions[state.penalty ? 'on' : 'off'] }]),
    ...(online ? [{ label: strings.playLabel, value: strings.plays[state.play] }] : []),
  ];
  return (
    <section className={cx(partyStyles.card, s.summary)} aria-label={strings.settings}>
      <dl className={s.summaryList}>
        {summary.map((row) => (
          <div key={row.label} className={s.summaryRow}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      {editable ? (
        <Button block onClick={() => setOpen(true)}>
          <Icon name="sliders" /> {strings.settings}
        </Button>
      ) : (
        <p className={s.summaryHint}>{strings.hostSets}</p>
      )}
      <Button variant="ghost" block onClick={() => setLookOpen(true)}>
        <Icon name="eye" /> {strings.look}
      </Button>
      {editable && <SettingsSheet value={state} onChange={onChange} online={online} open={open} onClose={() => setOpen(false)} />}
      <LookSheet open={lookOpen} onClose={() => setLookOpen(false)} />
    </section>
  );
}

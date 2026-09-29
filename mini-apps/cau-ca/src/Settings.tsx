import { useState } from 'react';
import { Chips } from '@bang/party';
import { Button, Icon, Segmented, Sheet, TextInput } from '@bang/ui';
import { getFinals, getPenalties, type Config } from './game';
import { strings, type Finale, type Penalty } from './strings';
import s from './Fish.module.css';

const penaltyOptions = (['on', 'off'] as const).map((v) => ({ value: v, label: strings.penaltyOptions[v] }));
const againOptions = (['on', 'off'] as const).map((v) => ({ value: v, label: strings.againOptions[v] }));
const finaleOptions = (Object.keys(strings.finaleOptions) as Finale[]).map((v) => ({ value: v, label: strings.finaleOptions[v] }));

type FishConfig = Required<Pick<Config, 'penalty' | 'finale' | 'again'>> & Pick<Config, 'customPenalties' | 'customFinals'>;

const penaltyTypeOptions = [
  { value: 'miss', label: 'Khi lật trượt (6 ô)' },
  { value: 'final', label: 'Phạt cuối ván (6 ô)' },
];

function PenaltiesSheet({
  config,
  onChange,
  open,
  onClose,
}: {
  config: FishConfig;
  onChange: (c: Config) => void;
  open: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<'miss' | 'final'>('miss');
  const missPenalties = [...getPenalties(config)];
  const finals = [...getFinals(config)];

  const updateMiss = (idx: number, patch: Partial<Penalty>) => {
    const next = [...missPenalties];
    next[idx] = { ...next[idx], ...patch };
    onChange({ customPenalties: next });
  };

  const updateFinal = (idx: number, patch: Partial<Penalty>) => {
    const next = [...finals];
    next[idx] = { ...next[idx], ...patch };
    onChange({ customFinals: next });
  };

  const resetCurrentTab = () => {
    if (tab === 'miss') onChange({ customPenalties: undefined });
    else onChange({ customFinals: undefined });
  };

  const isMiss = tab === 'miss';
  const list = isMiss ? missPenalties : finals;
  const updateItem = isMiss ? updateMiss : updateFinal;

  return (
    <Sheet open={open} title="Tùy chỉnh hình phạt" closeLabel="Xong" onClose={onClose}>
      <div className={s.penaltyEditor}>
        <Segmented
          label="Loại hình phạt"
          options={penaltyTypeOptions}
          value={tab}
          onChange={(v) => setTab(v as 'miss' | 'final')}
        />

        <div className={s.guideBox}>
          <p className={s.guideText}>
            {isMiss ? 'Vòng quay khi lật 2 lá không trùng nhau (6 ô)' : 'Hình phạt dành cho người thua cuối ván (6 ô)'}
          </p>
          <p className={s.guideHint}>
            • <strong>Tên ngắn</strong>: Hiển thị trên ô nan quạt hoặc lá thăm (tối đa 14 ký tự).<br />
            • <strong>Nội dung chi tiết</strong>: Kết quả đọc to khi quay trúng hoặc bốc thăm.
          </p>
        </div>

        <div className={s.editorActions}>
          <Button onClick={resetCurrentTab}>
            <Icon name="close" /> Khôi phục 6 ô này về mặc định
          </Button>
        </div>

        <div className={s.penaltyList}>
          {list.map((p, i) => (
            <div key={`${tab}-${i}`} className={s.penaltyCard}>
              <div className={s.penaltyCardHeader}>
                <span className={s.penaltyBadge}>
                  <span className={s.penaltyBadgeDot}>{i + 1}</span>
                  <span>Ô số {i + 1}</span>
                </span>
                {p.safe && <span className={s.guideHint} style={{ color: 'var(--paint-green)', fontWeight: 600 }}>✓ Ô an toàn (miễn phạt)</span>}
              </div>

              <div className={s.fieldGroup}>
                <label className={s.fieldLabel} htmlFor={`p-short-${tab}-${i}`}>Tên trên ô quay (ngắn gọn):</label>
                <TextInput
                  id={`p-short-${tab}-${i}`}
                  value={p.short}
                  maxLength={14}
                  placeholder="Ví dụ: 1 ngụm, hát 1 câu, được tha..."
                  onChange={(e) => updateItem(i, { short: e.target.value })}
                />
              </div>

              <div className={s.fieldGroup}>
                <label className={s.fieldLabel} htmlFor={`p-text-${tab}-${i}`}>Nội dung phạt chi tiết (đọc to khi trúng):</label>
                <TextInput
                  id={`p-text-${tab}-${i}`}
                  value={p.text}
                  maxLength={60}
                  placeholder="Ví dụ: Uống 1 ngụm đồ uống, chống đẩy 5 cái..."
                  onChange={(e) => updateItem(i, { text: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>

        <Button variant="primary" block onClick={onClose}>
          Hoàn tất
        </Button>
      </div>
    </Sheet>
  );
}

export function FishSettings({ value, onChange, editable }: { value: Config; onChange: (c: Config) => void; editable: boolean }) {
  const [penaltiesOpen, setPenaltiesOpen] = useState(false);
  const v: FishConfig = {
    penalty: value.penalty ?? true,
    again: value.again ?? false,
    finale: value.finale ?? 'wheel',
    customPenalties: value.customPenalties,
    customFinals: value.customFinals,
  };

  return (
    <div className={s.settings}>
      <Chips
        label={strings.penaltyLabel}
        options={penaltyOptions}
        value={v.penalty ? 'on' : 'off'}
        disabled={!editable}
        onChange={(p) => onChange({ ...value, penalty: p === 'on' })}
      />
      <Chips
        label={strings.againLabel}
        options={againOptions}
        value={v.again ? 'on' : 'off'}
        disabled={!editable}
        onChange={(a) => onChange({ ...value, again: a === 'on' })}
      />
      <Chips
        label={strings.finaleLabel}
        options={finaleOptions}
        value={v.finale}
        disabled={!editable}
        onChange={(finale) => onChange({ ...value, finale })}
      />
      {editable && (
        <button type="button" className={s.editPenaltyBtn} onClick={() => setPenaltiesOpen(true)}>
          <span className={s.editPenaltyBtnLabel}>
            <Icon name="sliders" size={18} />
            <span>Tùy chỉnh chi tiết hình phạt</span>
          </span>
          <span className={s.editPenaltyBtnHint}>6 ô lật trượt & 6 ô cuối ván →</span>
        </button>
      )}
      <PenaltiesSheet config={v} onChange={onChange} open={penaltiesOpen} onClose={() => setPenaltiesOpen(false)} />
    </div>
  );
}

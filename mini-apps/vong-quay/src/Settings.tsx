import { useState } from 'react';
import { Chips, SettingsCard } from '@bang/party';
import { Button, Icon, Sheet, TextInput } from '@bang/ui';
import { wheelOf, type CustomWheels, type WheelConfig } from './game';
import { strings, type Level, type Slice } from './strings';
import s from './Wheel.module.css';

const levelOptions = (Object.keys(strings.levels) as Level[]).map((v) => ({ value: v, label: strings.levels[v] }));

export function WheelSettings({
  value,
  onChange,
  editable,
}: {
  value: WheelConfig;
  onChange: (patch: WheelConfig) => void;
  editable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const currentLevel: Level = value.level ?? 'vua';
  const customWheels: CustomWheels = value.customWheels ?? {};
  const slices = wheelOf(currentLevel, customWheels);

  const updateSlice = (idx: number, patch: Partial<Slice>) => {
    const list = [...slices];
    list[idx] = { ...list[idx], ...patch };
    onChange({
      ...value,
      customWheels: {
        ...customWheels,
        [currentLevel]: list,
      },
    });
  };

  const resetCurrentLevel = () => {
    const next = { ...customWheels };
    delete next[currentLevel];
    onChange({
      ...value,
      customWheels: next,
    });
  };

  return (
    <SettingsCard editable={editable}>
      <Chips
        label={strings.levelLabel}
        options={levelOptions}
        value={currentLevel}
        disabled={!editable}
        onChange={(level) => onChange({ ...value, level })}
      />
      {editable && (
        <button type="button" className={s.editWheelBtn} onClick={() => setOpen(true)}>
          <span className={s.editWheelBtnLabel}>
            <Icon name="sliders" size={18} />
            <span>Tùy chỉnh 8 ô quay ({strings.levels[currentLevel]})</span>
          </span>
          <span className={s.editWheelBtnHint}>Sửa tên ô & nội dung chi tiết →</span>
        </button>
      )}
      <Sheet open={open} title={`Tùy chỉnh 8 ô quay (${strings.levels[currentLevel]})`} closeLabel="Xong" onClose={() => setOpen(false)}>
        <div className={s.sliceEditor}>
          <div className={s.guideBox}>
            <p className={s.guideText}>Vòng quay gồm 8 ô (mức {strings.levels[currentLevel]})</p>
            <p className={s.guideHint}>
              • <strong>Tên ngắn</strong>: Hiển thị trực tiếp trên nan quạt của vòng quay (tối đa 14 ký tự).<br />
              • <strong>Nội dung thử thách</strong>: Lời thông báo đọc to khi kim quay trúng.
            </p>
          </div>

          <div className={s.editorActions}>
            <Button onClick={resetCurrentLevel}>
              <Icon name="close" /> Khôi phục 8 ô mức này về mặc định
            </Button>
          </div>

          <div className={s.sliceList}>
            {slices.map((slice, i) => (
              <div key={i} className={s.sliceCard}>
                <div className={s.sliceCardHeader}>
                  <span className={s.sliceBadge}>
                    <span className={s.sliceBadgeDot} data-tone={i % 4}>
                      {i + 1}
                    </span>
                    <span>Ô số {i + 1}</span>
                  </span>
                  {slice.kind === 'safe' && (
                    <span className={s.guideHint} style={{ color: 'var(--paint-green)', fontWeight: 600 }}>
                      ✓ Ô an toàn (miễn phạt)
                    </span>
                  )}
                  {slice.kind === 'again' && (
                    <span className={s.guideHint} style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      ↻ Quay thêm lần nữa
                    </span>
                  )}
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel} htmlFor={`slice-short-${i}`}>
                    Tên trên ô quay (ngắn gọn):
                  </label>
                  <TextInput
                    id={`slice-short-${i}`}
                    value={slice.short}
                    maxLength={14}
                    placeholder="Ví dụ: 1 ngụm, hát 1 câu..."
                    onChange={(e) => updateSlice(i, { short: e.target.value })}
                  />
                </div>

                <div className={s.fieldGroup}>
                  <label className={s.fieldLabel} htmlFor={`slice-text-${i}`}>
                    Nội dung thử thách chi tiết (đọc to khi trúng):
                  </label>
                  <TextInput
                    id={`slice-text-${i}`}
                    value={slice.text}
                    maxLength={60}
                    placeholder="Ví dụ: Uống 1 ngụm đồ uống, kể 1 chuyện vui..."
                    onChange={(e) => updateSlice(i, { text: e.target.value })}
                  />
                </div>
              </div>
            ))}
          </div>
          <Button variant="primary" block onClick={() => setOpen(false)}>
            Hoàn tất
          </Button>
        </div>
      </Sheet>
    </SettingsCard>
  );
}

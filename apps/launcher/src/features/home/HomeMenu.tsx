import { useState } from 'react';
import { readProfile, writeProfile } from '@bang/party';
import { Field, Icon, ListRow, Sheet, TextInput } from '@bang/ui';
import { t } from '@/i18n/vi';
import s from './PixelHome.module.css';

interface HomeMenuProps {
  open: boolean;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onAdd: () => void;
  onManage: () => void;
  onSettings: () => void;
}

/** Menu của trang chủ pixel: tên người chơi dùng chung cho mọi game, thêm app, quản lý, cài đặt. */
export function HomeMenu({ open, onClose, onNameChange, onAdd, onManage, onSettings }: HomeMenuProps) {
  const [name, setName] = useState(() => readProfile().name ?? '');
  const go = (fn: () => void) => () => {
    onClose();
    fn();
  };

  return (
    <Sheet open={open} title={t.home.menuTitle} closeLabel={t.common.close} onClose={onClose}>
      <div className={s.menu}>
        <Field label={t.home.yourName} htmlFor="home-name" hint={t.home.nameHint}>
          <TextInput
            id="home-name"
            value={name}
            maxLength={20}
            autoComplete="nickname"
            placeholder={t.home.namePlaceholder}
            onChange={(e) => {
              setName(e.target.value);
              const clean = e.target.value.trim();
              writeProfile({ ...readProfile(), name: clean });
              onNameChange(clean);
            }}
          />
        </Field>
        <div className={s.menuList}>
          <ListRow lead={<Icon name="plus" />} title={t.home.add} onClick={go(onAdd)} chevron />
          <ListRow lead={<Icon name="more" />} title={t.home.manage} onClick={go(onManage)} chevron />
          <ListRow lead={<Icon name="sliders" />} title={t.home.settings} onClick={go(onSettings)} chevron />
        </div>
      </div>
    </Sheet>
  );
}

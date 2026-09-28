import { ListRow, Segmented, SectionHeader, Switch, TopBar, pad2, type ThemeMode, type UiLook } from '@bang/ui';
import { appConfig, type ColumnCount } from '@/config/app';
import { t } from '@/i18n/vi';
import { Screen } from '@/layout/Screen';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useApps } from '@/registry/useApps';
import { useLauncherStore } from '@/store/launcherStore';
import { useUiStore } from '@/store/uiStore';
import { usePinFlows } from '@/features/pin/usePinFlows';
import { exportData, importData, wipeData } from './dataTransfer';
import s from './Settings.module.css';

const themeOptions = (Object.keys(t.settings.themeOptions) as ThemeMode[]).map((v) => ({ value: v, label: t.settings.themeOptions[v] }));
// Thứ tự theo i18n: kiểu mặc định lên đầu.
const lookIds = Object.keys(t.settings.lookOptions) as UiLook[];
const columnOptions = appConfig.columnOptions.map((n) => ({ value: n, label: t.settings.columnLabel(n) }));

export function SettingsPage() {
  const settings = useLauncherStore((st) => st.settings);
  const updateSettings = useLauncherStore((st) => st.updateSettings);
  const openSheet = useUiStore((st) => st.openSheet);
  const { all } = useApps();
  const { goBack, openManage } = useAppNavigation();
  const pin = usePinFlows();
  const version = import.meta.env.PACKAGE_VERSION ?? '';

  return (
    <Screen bar={<TopBar title={t.settings.title} backLabel={t.common.back} onBack={goBack} />}>
      <SectionHeader label={t.settings.appearance} index="01" />
      <div className={s.block}>
        <p className={s.label}>{t.settings.look}</p>
        <div className={s.looks} role="radiogroup" aria-label={t.settings.look}>
          {lookIds.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={settings.look === id}
              className={s.look}
              onClick={() => updateSettings({ look: id, custom: {} })}
            >
              <span className={s.lookName}>{t.settings.lookOptions[id].name}</span>
              <span className={s.lookDesc}>{t.settings.lookOptions[id].desc}</span>
            </button>
          ))}
        </div>
        <p className={s.hint}>{t.settings.lookHint}</p>
        <div className={s.gap} />
        <p className={s.label}>{t.settings.theme}</p>
        <Segmented label={t.settings.theme} options={themeOptions} value={settings.theme} onChange={(theme) => updateSettings({ theme })} />
        <div className={s.gap} />
        <p className={s.label}>{t.settings.columns}</p>
        <Segmented<ColumnCount> label={t.settings.columns} options={columnOptions} value={settings.columns} onChange={(columns) => updateSettings({ columns })} />
      </div>
      <ListRow
        title={t.settings.customize}
        subtitle={t.settings.customizeSub}
        value={Object.keys(settings.custom).length ? t.settings.customized : undefined}
        chevron
        onClick={() => openSheet({ kind: 'style' })}
      />

      <SectionHeader label={t.settings.security} index="02" />
      <ListRow
        title={t.settings.pin}
        subtitle={t.settings.pinSub}
        trailing={<Switch label={t.settings.pin} checked={!!settings.pinHash} onChange={(on) => (on ? pin.enable() : pin.disable())} />}
      />
      {settings.pinHash && <ListRow title={t.settings.pinChange} chevron onClick={pin.change} />}

      <SectionHeader label={t.settings.data} index="03" />
      <ListRow title={t.settings.manage} value={t.common.appCount(all.length)} chevron onClick={openManage} />
      <ListRow title={t.settings.export} subtitle={t.settings.exportSub} onClick={exportData} />
      <ListRow title={t.settings.import} subtitle={t.settings.importSub} onClick={importData} />
      <ListRow title={t.settings.wipe} danger onClick={wipeData} />

      <SectionHeader label={t.settings.other} index="04" />
      <ListRow title={t.settings.install} chevron onClick={() => openSheet({ kind: 'install' })} />
      <ListRow title={t.settings.version} value={version || pad2(0)} />
    </Screen>
  );
}

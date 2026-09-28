import { ListRow, RowIconButton, SectionHeader, Tag, TopBar, TopBarTextButton, keyColorStyle, pad2 } from '@bang/ui';
import { t } from '@/i18n/vi';
import { Screen } from '@/layout/Screen';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useApps } from '@/registry/useApps';
import { useLauncherStore } from '@/store/launcherStore';
import { useUiStore } from '@/store/uiStore';
import s from './ManagePage.module.css';

export function ManagePage() {
  const { all } = useApps();
  const { goBack } = useAppNavigation();
  const { updateApp, move } = useLauncherStore();
  const openSheet = useUiStore((st) => st.openSheet);
  const order = all.map((a) => a.id);

  return (
    <Screen
      bar={
        <TopBar
          title={t.manage.title}
          backLabel={t.common.back}
          onBack={goBack}
          actions={<TopBarTextButton onClick={() => openSheet({ kind: 'app-form' })}>{t.manage.add}</TopBarTextButton>}
        />
      }
    >
      <p className={s.note}>{t.manage.note}</p>
      <SectionHeader label={t.manage.all} index={pad2(all.length)} />
      {!all.length && <p className={s.empty}>{t.manage.empty}</p>}
      {all.map((app, i) => (
        <ListRow
          key={app.id}
          dim={app.hidden}
          lead={
            <>
              <span className={s.index}>{pad2(app.index)}</span>
              <span className={s.swatch} style={keyColorStyle(app.color)} />
            </>
          }
          title={app.name}
          subtitle={
            <>
              <Tag>{app.kind === 'link' ? t.common.typeLink : t.common.typeCode}</Tag>
              {app.group}
              {app.hidden && t.manage.hiddenSuffix}
            </>
          }
          onClick={() => openSheet({ kind: 'app-form', appId: app.id })}
          trailing={
            <>
              <RowIconButton
                icon={app.hidden ? 'eye' : 'eyeOff'}
                label={app.hidden ? t.manage.show(app.name) : t.manage.hide(app.name)}
                onClick={() => updateApp(app.id, { hidden: !app.hidden })}
              />
              <RowIconButton icon="up" label={t.manage.up(app.name)} disabled={i === 0} onClick={() => move(app.id, -1, order)} />
              <RowIconButton icon="down" label={t.manage.down(app.name)} disabled={i === all.length - 1} onClick={() => move(app.id, 1, order)} />
            </>
          }
        />
      ))}
    </Screen>
  );
}

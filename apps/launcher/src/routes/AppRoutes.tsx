import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '@/features/home/HomePage';
import { ManagePage } from '@/features/manage/ManagePage';
import { RunnerPage } from '@/features/runner/RunnerPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { paths } from './paths';

/**
 * Bảng app là route cha, luôn được giữ lại; các màn con hiện đè lên trên.
 * Nhờ vậy quay về bảng không mất vị trí cuộn, và nút back của điện thoại luôn đúng.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path={paths.home} element={<HomePage />}>
        <Route path={paths.appPattern} element={<RunnerPage />} />
        <Route path={paths.settings.slice(1)} element={<SettingsPage />} />
        <Route path={paths.manage.slice(1)} element={<ManagePage />} />
      </Route>
      <Route path="*" element={<Navigate to={paths.home} replace />} />
    </Routes>
  );
}

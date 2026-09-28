import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@bang/ui';
import { AppRoutes } from '@/routes/AppRoutes';
import { useLauncherStore } from '@/store/launcherStore';
import { GlobalLayers } from '@/ui/GlobalLayers';

export function App() {
  const theme = useLauncherStore((s) => s.settings.theme);
  const look = useLauncherStore((s) => s.settings.look);
  const custom = useLauncherStore((s) => s.settings.custom);
  return (
    <ThemeProvider mode={theme} look={look} custom={custom}>
      <BrowserRouter>
        <AppRoutes />
        <GlobalLayers />
      </BrowserRouter>
    </ThemeProvider>
  );
}

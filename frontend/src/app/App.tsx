import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage, RegisterPage } from '@/modules/auth';
import { DiscoverPage } from '@/modules/server';
import { Toaster } from '@/shared/ui';
import { GuestOnly, RequireAuth } from './guards';
import { AppShell } from './layouts/AppShell';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { ServerPage } from './pages/ServerPage';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/app" element={<RequireAuth><AppShell /></RequireAuth>}>
          <Route index element={<HomePage />} />
          <Route path="discover" element={<div className="flex-1"><DiscoverPage /></div>} />
          <Route path=":serverId" element={<ServerPage />} />
          <Route path=":serverId/:channelId" element={<ServerPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

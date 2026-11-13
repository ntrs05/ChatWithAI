import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/shared/ui';
import { AppShell } from './layouts/AppShell';
import { HomePage } from './pages/HomePage';
import { LandingPage } from './pages/LandingPage';
import { ServerPage } from './pages/ServerPage';

// route đã đủ, trang nào chưa xong thì để placeholder
// TODO: auth xong thì bọc thêm GuestOnly / RequireAuth, trang admin chỉ cho admin vào.
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Slot name="LoginPage" from="auth" />} />
        <Route path="/register" element={<Slot name="RegisterPage" from="auth" />} />
        <Route path="/app" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="friends" element={<Slot name="FriendsView" from="friends" grow />} />
          <Route path="notifications" element={<Slot name="NotificationsView" from="notifications" grow />} />
          <Route path="settings" element={<Slot name="SettingsPage" from="auth" grow />} />
          <Route path="admin" element={<Slot name="AdminPage" from="admin" grow />} />
          <Route path="dm/:conversationId" element={<Slot name="DirectPage" from="direct" grow />} />
          <Route path="discover" element={<Slot name="DiscoverPage" from="server" grow />} />
          <Route path=":serverId" element={<ServerPage />} />
          <Route path=":serverId/:channelId" element={<ServerPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}

// placeholder, thay bằng component thật khi module xong
function Slot({ name, from, grow = false }: { name: string; from: string; grow?: boolean }) {
  return (
    <div className={`flex min-h-[110px] items-center justify-center p-3 ${grow ? 'flex-1' : ''}`}>
      <div className="rounded-xl border border-dashed border-zinc-600 px-5 py-4 text-center text-zinc-400">
        <p className="font-semibold text-zinc-100">{name}</p>
        <p className="mt-1 text-xs">module {from} · chưa ghép</p>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/modules/auth';
import { FullScreenLoader } from '@/shared/ui';

export function RequireAuth({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();
  if (status === 'checking') return <FullScreenLoader label="Đang kiểm tra phiên đăng nhập…" />;
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export function GuestOnly({ children }: { children: ReactNode }) {
  const status = useAuthStore((s) => s.status);
  if (status === 'checking') return <FullScreenLoader />;
  if (status === 'authenticated') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

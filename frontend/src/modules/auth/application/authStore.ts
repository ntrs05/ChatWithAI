import { create } from 'zustand';
import type { User } from '../domain/User';

export type AuthStatus = 'checking' | 'authenticated' | 'anonymous';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
}

export const useAuthStore = create<AuthState>(() => ({
  status: 'checking',
  user: null,
  token: null,
}));

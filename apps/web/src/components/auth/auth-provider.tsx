'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as api from '@/lib/api';
import { onSessionExpired } from '@/lib/session';
import type { SessionUser } from '@/lib/types';

interface AuthContextValue {
  user: SessionUser | null;
  // true enquanto a tentativa inicial de restaurar a sessão (cookie de refresh) não terminou.
  booting: boolean;
  signIn: (email: string, password: string) => Promise<SessionUser>;
  signUp: (name: string, email: string, password: string) => Promise<SessionUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.refreshSession().then((restored) => {
      if (cancelled) return;
      setUser(restored);
      setBooting(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(
    () =>
      onSessionExpired(() => {
        setUser(null);
        router.replace(`/login?next=${encodeURIComponent(pathname)}`);
      }),
    [router, pathname],
  );

  const signIn = useCallback(async (email: string, password: string) => {
    const next = await api.login(email, password);
    setUser(next);
    return next;
  }, []);

  const signUp = useCallback(async (name: string, email: string, password: string) => {
    const next = await api.register(name, email, password);
    setUser(next);
    return next;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      router.replace('/login');
    }
  }, [router]);

  const value = useMemo(() => ({ user, booting, signIn, signUp, signOut }), [user, booting, signIn, signUp, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de AuthProvider');
  return ctx;
}

export function useUser(): SessionUser {
  const { user } = useAuth();
  if (!user) throw new Error('useUser só pode ser usado em telas autenticadas');
  return user;
}

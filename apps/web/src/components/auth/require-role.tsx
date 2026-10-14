'use client';

import { ShieldAlert } from 'lucide-react';
import { useAuth } from './auth-provider';
import type { Role } from '@/lib/types';

// Esconde telas que o perfil não pode usar. A API também recusa (403); isto só evita a tela vazia de erro.
export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;
  if (!roles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <ShieldAlert size={22} className="text-ink-3" aria-hidden />
        <p className="text-[14px] text-ink-2">Seu perfil não tem acesso a esta tela.</p>
      </div>
    );
  }
  return <>{children}</>;
}

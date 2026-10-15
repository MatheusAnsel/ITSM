'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button, Field, FormError, Input } from '@/components/ui/form';
import { ApiError } from '@/lib/api';
import { safeNext } from '@/lib/navigation';

// Modo demonstração: só aparece quando o build define NEXT_PUBLIC_DEMO_MODE=true. A senha é pública de propósito.
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
// Mesma senha publicada no README; define-se NEXT_PUBLIC_DEMO_PASSWORD se a DEMO_PASSWORD da API for outra.
const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? 'Demo-Itsm-2026';
const DEMO_USERS = [
  { label: 'Gestor', hint: 'painel, SLA e auditoria', email: 'gestor@itsm.local' },
  { label: 'Atendente', hint: 'fila e atendimento', email: 'atendente@itsm.local' },
  { label: 'Solicitante', hint: 'abrir e acompanhar chamados', email: 'solicitante@itsm.local' },
] as const;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, booting, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const next = safeNext(params.get('next'));

  // Quem já tem sessão válida (cookie de refresh) não precisa ver o formulário.
  useEffect(() => {
    if (!booting && user) router.replace(next);
  }, [booting, user, next, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    await login(email, password);
  }

  async function login(emailValue: string, passwordValue: string) {
    setError(null);
    setLoading(true);
    try {
      await signIn(emailValue, passwordValue);
      router.replace(next);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
      <Field label="E-mail">
        <Input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" className="h-10" />
      </Field>
      <Field label="Senha">
        <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
      </Field>
      <FormError message={error} />
      <Button type="submit" variant="primary" disabled={loading || !email || !password} className="h-10 w-full text-[14px]">
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
      <p className="pt-1 text-center text-xs text-ink-3">
        Não tem conta?{' '}
        <Link href="/register" className="text-info hover:underline">
          Criar conta de solicitante
        </Link>
      </p>
      {DEMO_MODE && DEMO_PASSWORD ? (
        <div className="space-y-2 border-t border-line pt-3.5">
          <p className="text-center text-xs text-ink-3">Demonstração: entre com um clique</p>
          {DEMO_USERS.map((u) => (
            <Button
              key={u.email}
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => login(u.email, DEMO_PASSWORD)}
              className="h-auto w-full flex-col gap-0 py-2 text-[13px]"
            >
              <span>Entrar como {u.label}</span>
              <span className="text-[11px] font-normal text-ink-3">{u.hint}</span>
            </Button>
          ))}
          <p className="text-center text-[11px] text-ink-3">A primeira entrada pode levar cerca de um minuto (servidor gratuito acordando).</p>
        </div>
      ) : null}
    </form>
  );
}

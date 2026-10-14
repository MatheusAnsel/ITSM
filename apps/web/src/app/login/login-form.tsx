'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button, Field, FormError, Input } from '@/components/ui/form';
import { ApiError } from '@/lib/api';
import { safeNext } from '@/lib/navigation';

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
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
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
    </form>
  );
}

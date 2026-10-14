'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button, Field, FormError, Input } from '@/components/ui/form';
import { ApiError } from '@/lib/api';

export const MIN_PASSWORD = 10;

export function RegisterForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace('/tickets');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
      <Field label="Nome">
        <Input autoComplete="name" required minLength={2} maxLength={100} value={name} onChange={(e) => setName(e.target.value)} className="h-10" />
      </Field>
      <Field label="E-mail">
        <Input type="email" autoComplete="username" required maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
      </Field>
      <Field label="Senha" hint={`Ao menos ${MIN_PASSWORD} caracteres`} error={tooShort ? `Faltam ${MIN_PASSWORD - password.length} caracteres` : null}>
        <Input type="password" autoComplete="new-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
      </Field>
      <FormError message={error} />
      <Button
        type="submit"
        variant="primary"
        disabled={loading || name.trim().length < 2 || !email || password.length < MIN_PASSWORD}
        className="h-10 w-full text-[14px]"
      >
        {loading ? 'Criando...' : 'Criar conta'}
      </Button>
      <p className="pt-1 text-center text-xs text-ink-3">
        Já tem conta?{' '}
        <Link href="/login" className="text-info hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}

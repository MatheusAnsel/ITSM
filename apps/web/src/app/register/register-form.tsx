'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button, Field, FormError, Input } from '@/components/ui/form';
import { ApiError } from '@/lib/api';
import { MIN_PASSWORD, type RegisterErrors, serverFieldErrors, validateRegister } from '@/lib/validation';

export { MIN_PASSWORD };

export function RegisterForm() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<RegisterErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // O botão nunca fica desabilitado em silêncio: se algo estiver errado, dizemos o quê e onde.
    const problems = validateRegister({ name, email, password });
    setFieldErrors(problems);
    const first = (['name', 'email', 'password'] as const).find((key) => problems[key]);
    if (first) {
      (event.currentTarget.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }

    setLoading(true);
    try {
      await signUp(name.trim(), email.trim(), password);
      router.replace('/tickets');
    } catch (e) {
      if (e instanceof ApiError) {
        const fromServer = e.status === 409 ? { email: e.message } : serverFieldErrors(e.fields);
        setFieldErrors(fromServer);
        // O motivo já aparece junto do campo; a mensagem geral só entra quando não há campo para apontar.
        setError(Object.keys(fromServer).length > 0 ? (e.status === 409 ? null : 'Confira os campos destacados.') : e.message);
      } else {
        setError('Erro inesperado');
      }
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
      <Field label="Nome" error={fieldErrors.name}>
        <Input name="name" autoComplete="name" required maxLength={100} value={name} aria-invalid={!!fieldErrors.name} onChange={(e) => setName(e.target.value)} className="h-10" />
      </Field>
      <Field label="E-mail" error={fieldErrors.email}>
        <Input name="email" type="email" autoComplete="username" required maxLength={254} value={email} aria-invalid={!!fieldErrors.email} onChange={(e) => setEmail(e.target.value)} className="h-10" />
      </Field>
      <Field
        label="Senha"
        hint={`Ao menos ${MIN_PASSWORD} caracteres`}
        error={fieldErrors.password ?? (tooShort ? `Faltam ${MIN_PASSWORD - password.length} caracteres` : null)}
      >
        <Input name="password" type="password" autoComplete="new-password" required maxLength={128} value={password} aria-invalid={!!fieldErrors.password} onChange={(e) => setPassword(e.target.value)} className="h-10" />
      </Field>
      <FormError message={error} />
      <Button type="submit" variant="primary" disabled={loading} className="h-10 w-full text-[14px]">
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

'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { Button, Field, FormError, Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { ApiError, changePassword } from '@/lib/api';
import { ROLE_LABEL } from '@/lib/labels';

const MIN = 10;

export default function AccountPage() {
  const { user, signOut } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const mismatch = confirm.length > 0 && confirm !== next;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await changePassword(current, next);
      // A API encerra todas as sessões ao trocar a senha: entra de novo com a nova.
      await signOut();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Minha conta" subtitle={`${user.name} · ${user.email} · ${ROLE_LABEL[user.role]}`} />
      <form onSubmit={onSubmit} className="max-w-[420px] space-y-3.5 rounded-xl border border-line bg-panel/60 p-5" noValidate>
        <h2 className="text-[14px] font-medium">Alterar senha</h2>
        <Field label="Senha atual">
          <Input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        </Field>
        <Field label="Nova senha" hint={`Ao menos ${MIN} caracteres`}>
          <Input type="password" autoComplete="new-password" maxLength={128} value={next} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <Field label="Confirmar nova senha" error={mismatch ? 'As senhas não conferem' : null}>
          <Input type="password" autoComplete="new-password" maxLength={128} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </Field>
        <FormError message={error} />
        <p className="text-xs text-ink-3">Por segurança, você será desconectado e precisará entrar de novo.</p>
        <Button type="submit" variant="primary" disabled={busy || !current || next.length < MIN || next !== confirm}>
          {busy ? 'Salvando...' : 'Alterar senha'}
        </Button>
      </form>
    </>
  );
}

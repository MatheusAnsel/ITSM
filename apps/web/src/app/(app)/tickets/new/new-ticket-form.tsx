'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useUser } from '@/components/auth/auth-provider';
import { Button, Field, FormError, Input, Select, Textarea } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { ApiError, createTicket, listAssets, listCategories, listSlaPolicies } from '@/lib/api';
import { formatDuration } from '@/lib/format';
import { PRIORITY_LABEL } from '@/lib/labels';
import { isStaff, PRIORITIES, type Priority } from '@/lib/types';

export function NewTicketForm() {
  const user = useUser();
  const staff = isStaff(user.role);
  const router = useRouter();
  const categories = useAsync(listCategories, []);
  // A lista de ativos e as políticas de SLA só existem para a equipe (a API recusa os demais).
  const assets = useAsync(() => (staff ? listAssets({ pageSize: 100 }) : Promise.resolve(null)), [staff]);
  const policies = useAsync(() => (staff ? listSlaPolicies() : Promise.resolve(null)), [staff]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [assetId, setAssetId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (categories.error) return <ErrorState message={categories.error} onRetry={categories.reload} />;
  if (!categories.data) return <Loading />;

  const active = categories.data.filter((c) => c.active);
  const policy = policies.data?.find((p) => p.priority === priority);
  const valid = title.trim().length >= 3 && description.trim().length >= 3 && categoryId;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const ticket = await createTicket({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        priority,
        assetId: assetId || undefined,
      });
      router.push(`/tickets/${ticket.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
      setBusy(false);
    }
  }

  return (
    <>
      <Link href="/tickets" className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink">
        <ArrowLeft size={13} /> Chamados
      </Link>
      <PageHeader title="Novo chamado" subtitle="Descreva o problema com o máximo de detalhe que puder." />
      <form onSubmit={onSubmit} className="max-w-[640px] space-y-4 rounded-xl border border-line bg-panel/60 p-5" noValidate>
        <Field label="Título" hint="Resuma em uma frase">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} required autoFocus />
        </Field>
        <Field label="Descrição" hint="O que aconteceu, desde quando e o que já tentou">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} rows={6} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Categoria">
            <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} required>
              <option value="">Selecione...</option>
              {active.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
          <Field
            label="Prioridade"
            hint={policy ? `Primeira resposta em ${formatDuration(policy.firstResponseMinutes)}, resolução em ${formatDuration(policy.resolutionMinutes)}` : undefined}
          >
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
              ))}
            </Select>
          </Field>
        </div>
        {staff && (
          <Field label="Ativo relacionado (opcional)">
            <Select value={assetId} onChange={(e) => setAssetId(e.target.value)}>
              <option value="">Nenhum</option>
              {assets.data?.items
                .filter((a) => a.status !== 'RETIRED')
                .map((a) => (
                  <option key={a.id} value={a.id}>{a.tag} · {a.name}</option>
                ))}
            </Select>
          </Field>
        )}
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button onClick={() => router.push('/tickets')} disabled={busy}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" disabled={!valid || busy}>
            {busy ? 'Abrindo...' : 'Abrir chamado'}
          </Button>
        </div>
      </form>
    </>
  );
}

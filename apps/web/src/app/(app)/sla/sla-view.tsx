'use client';

import { useState } from 'react';
import { useUser } from '@/components/auth/auth-provider';
import { PriorityBadge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Button, Field, FormError, Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { ApiError, listSlaPolicies, updateSlaPolicy } from '@/lib/api';
import { formatDateTime, formatDuration } from '@/lib/format';
import { PRIORITY_LABEL } from '@/lib/labels';
import type { SlaPolicy } from '@/lib/types';

function EditDialog({ policy, onClose, onSaved }: { policy: SlaPolicy; onClose: () => void; onSaved: () => void }) {
  const [first, setFirst] = useState(String(policy.firstResponseMinutes));
  const [resolution, setResolution] = useState(String(policy.resolutionMinutes));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const a = Number(first);
  const b = Number(resolution);
  const valid = Number.isInteger(a) && Number.isInteger(b) && a > 0 && b > 0 && a <= b;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await updateSlaPolicy(policy.priority, { firstResponseMinutes: a, resolutionMinutes: b });
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Erro inesperado');
      setBusy(false);
    }
  }

  return (
    <Dialog open onClose={onClose} title={`SLA · prioridade ${PRIORITY_LABEL[policy.priority]}`}>
      <form onSubmit={submit} className="space-y-3.5" noValidate>
        <Field label="Primeira resposta (minutos)" hint={valid ? `≈ ${formatDuration(a)}` : undefined}>
          <Input type="number" min={1} inputMode="numeric" value={first} onChange={(e) => setFirst(e.target.value)} />
        </Field>
        <Field
          label="Resolução (minutos)"
          hint={valid ? `≈ ${formatDuration(b)}` : undefined}
          error={Number.isInteger(a) && Number.isInteger(b) && a > b ? 'A resolução não pode ser menor que a primeira resposta' : null}
        >
          <Input type="number" min={1} inputMode="numeric" value={resolution} onChange={(e) => setResolution(e.target.value)} />
        </Field>
        <p className="text-xs text-ink-3">Vale para chamados abertos a partir de agora; os já abertos mantêm os prazos calculados.</p>
        <FormError message={error} />
        <div className="flex justify-end gap-2">
          <Button onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button type="submit" variant="primary" disabled={!valid || busy}>{busy ? 'Salvando...' : 'Salvar'}</Button>
        </div>
      </form>
    </Dialog>
  );
}

export function SlaView() {
  const user = useUser();
  const policies = useAsync(listSlaPolicies, []);
  const [editing, setEditing] = useState<SlaPolicy | null>(null);

  return (
    <>
      <PageHeader title="Políticas de SLA" subtitle="Prazos de primeira resposta e de resolução por prioridade" />
      {policies.error ? (
        <ErrorState message={policies.error} onRetry={policies.reload} />
      ) : !policies.data ? (
        <Loading />
      ) : (
        <div className="overflow-hidden rounded-lg border border-line bg-panel">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-xs text-ink-2">
                <th className="px-4 py-3 font-medium">Prioridade</th>
                <th className="px-4 py-3 font-medium">Primeira resposta</th>
                <th className="px-4 py-3 font-medium">Resolução</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                {user.role === 'ADMIN' && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {policies.data.map((p) => (
                <tr key={p.priority} className="border-b border-line/70 last:border-0">
                  <td className="px-4 py-3"><PriorityBadge value={p.priority} /></td>
                  <td className="px-4 py-3 text-ink-2">{formatDuration(p.firstResponseMinutes)}</td>
                  <td className="px-4 py-3 text-ink-2">{formatDuration(p.resolutionMinutes)}</td>
                  <td className="px-4 py-3 text-xs text-ink-3">
                    {p.customized && p.updatedAt ? `Personalizada em ${formatDateTime(p.updatedAt)}` : 'Padrão do sistema'}
                  </td>
                  {user.role === 'ADMIN' && (
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" onClick={() => setEditing(p)}>Editar</Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && (
        <EditDialog
          policy={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            policies.reload();
          }}
        />
      )}
    </>
  );
}

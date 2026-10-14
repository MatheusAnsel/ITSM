'use client';

import { ArrowLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useUser } from '@/components/auth/auth-provider';
import { AssetStatusBadge, AssetTypeBadge, PriorityBadge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/form';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { getAsset } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { isManager } from '@/lib/types';
import { AssetFormDialog } from '../asset-form';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-[13px]">
      <dt className="shrink-0 text-ink-3">{label}</dt>
      <dd className="min-w-0 break-words text-right text-ink-2">{children}</dd>
    </div>
  );
}

export function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useUser();
  const asset = useAsync(() => getAsset(id), [id]);
  const [editing, setEditing] = useState(false);

  const back = (
    <Link href="/assets" className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink">
      <ArrowLeft size={13} /> Ativos
    </Link>
  );

  if (asset.error) {
    return (
      <>
        {back}
        <ErrorState message={asset.errorStatus === 404 ? 'Ativo não encontrado' : asset.error} onRetry={asset.reload} />
      </>
    );
  }
  if (!asset.data) return <Loading />;
  const a = asset.data;

  return (
    <>
      {back}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-xs text-ink-3">{a.tag}</div>
          <h1 className="text-[22px] font-semibold tracking-tight">{a.name}</h1>
          <div className="mt-3 flex gap-2">
            <AssetTypeBadge value={a.type} />
            <AssetStatusBadge value={a.status} />
          </div>
        </div>
        {isManager(user.role) && (
          <Button onClick={() => setEditing(true)}>
            <Pencil size={13} /> Editar
          </Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <dl className="h-fit divide-y divide-line rounded-xl border border-line bg-panel/60 px-4 py-1">
          <Row label="Responsável">{a.assignedTo?.name ?? 'Sem responsável'}</Row>
          <Row label="Número de série">{a.serialNumber ?? '—'}</Row>
          <Row label="Data de compra">{a.purchaseDate ? formatDate(a.purchaseDate) : '—'}</Row>
          <Row label="Cadastrado em">{formatDateTime(a.createdAt)}</Row>
          {a.notes && <Row label="Observações"><span className="whitespace-pre-wrap">{a.notes}</span></Row>}
        </dl>

        <section>
          <h2 className="mb-2.5 text-[13px] font-medium text-ink-2">Chamados vinculados</h2>
          {a.tickets.length === 0 ? (
            <p className="text-[13px] text-ink-3">Nenhum chamado vinculado a este ativo.</p>
          ) : (
            <ul className="space-y-1.5">
              {a.tickets.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tickets/${t.id}`}
                    className="flex items-center gap-3 rounded-lg border border-line bg-panel/60 px-3 py-2.5 hover:border-line-strong"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] text-ink">{t.title}</div>
                      <div className="text-xs text-ink-3">#{t.number} · {formatDateTime(t.createdAt)}</div>
                    </div>
                    <PriorityBadge value={t.priority} />
                    <StatusBadge value={t.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {editing && (
        <AssetFormDialog
          open
          asset={a}
          onClose={() => setEditing(false)}
          onSaved={() => {
            setEditing(false);
            asset.reload();
          }}
        />
      )}
    </>
  );
}

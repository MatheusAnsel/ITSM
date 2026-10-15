'use client';

import { useState } from 'react';
import { type Column, DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { listAudit } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import type { AuditEntry } from '@/lib/types';

const PAGE_SIZE = 20;
const ENTITIES = ['Ticket', 'User', 'Asset', 'Category', 'SlaPolicy', 'Attachment'];

const columns: Column<AuditEntry>[] = [
  { key: 'when', header: 'Quando', width: '150px', render: (a) => <span className="text-ink-2">{formatDateTime(a.createdAt)}</span> },
  { key: 'actor', header: 'Autor', width: '160px', render: (a) => <span className="text-ink">{a.actor?.name ?? 'Anônimo'}</span> },
  { key: 'action', header: 'Ação', render: (a) => <code className="rounded bg-ink/[0.06] px-1.5 py-0.5 text-xs text-ink-2">{a.action}</code> },
  { key: 'entity', header: 'Entidade', width: '130px', render: (a) => <span className="text-ink-2">{a.entity}</span> },
  {
    key: 'meta',
    header: 'Detalhes',
    render: (a) => (
      <span className="block max-w-[260px] truncate text-xs text-ink-3" title={a.metadata ? JSON.stringify(a.metadata) : undefined}>
        {a.metadata ? Object.entries(a.metadata).map(([k, v]) => `${k}: ${String(v)}`).join(' · ') : '—'}
        {a.ip ? ` · ${a.ip}` : ''}
      </span>
    ),
  },
];

export function AuditView() {
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');
  const [page, setPage] = useState(1);
  const valid = action === '' || /^[A-Z_]{2,40}$/.test(action);
  const audit = useAsync(
    () => listAudit({ action: action && valid ? action : undefined, entity: entity || undefined, page, pageSize: PAGE_SIZE }),
    [action, valid, entity, page],
  );

  return (
    <>
      <PageHeader title="Auditoria" subtitle="Registro de ações sensíveis. Somente leitura: logs nunca são alterados nem apagados." />
      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={action}
          onChange={(e) => { setAction(e.target.value.toUpperCase().replace(/\s/g, '_')); setPage(1); }}
          placeholder="Ação (ex.: LOGIN_FAILED)"
          aria-label="Filtrar por ação"
          aria-invalid={!valid}
          maxLength={40}
          className="min-w-[220px] flex-1"
        />
        <Select value={entity} onChange={(e) => { setEntity(e.target.value); setPage(1); }} aria-label="Entidade" className="w-auto">
          <option value="">Todas as entidades</option>
          {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
        </Select>
      </div>
      {audit.error ? (
        <ErrorState message={audit.error} onRetry={audit.reload} />
      ) : !audit.data ? (
        <Loading />
      ) : (
        <div className={audit.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <DataTable columns={columns} rows={audit.data.items} rowKey={(a) => a.id} empty="Nenhum registro" />
          <Pagination page={page} pageSize={PAGE_SIZE} total={audit.data.total} onChange={setPage} />
        </div>
      )}
    </>
  );
}

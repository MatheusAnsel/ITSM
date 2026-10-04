'use client';

import { Download, Maximize2, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { CategoryTile } from '@/components/ticket-category';
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui/badge';
import { DataTable, type Column } from '@/components/ui/data-table';
import { DemoNotice } from '@/components/ui/demo-notice';
import { PageHeader } from '@/components/ui/page-header';
import { DEMO_TICKETS } from '@/lib/demo-data';
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels';
import type { Priority, TicketRow, TicketStatus } from '@/lib/types';

const columns: Column<TicketRow>[] = [
  {
    key: 'title',
    header: 'Chamado',
    render: (t) => (
      <div className="flex items-center gap-3">
        <CategoryTile category={t.category} />
        <div className="min-w-0">
          <div className="truncate font-medium text-ink">{t.title}</div>
          <div className="text-xs text-ink-3">
            #{t.number} · {t.requester}
          </div>
        </div>
      </div>
    ),
  },
  { key: 'priority', header: 'Prioridade', width: '120px', render: (t) => <PriorityBadge value={t.priority} /> },
  { key: 'status', header: 'Status', width: '170px', render: (t) => <StatusBadge value={t.status} /> },
  { key: 'assignee', header: 'Atendente', width: '140px', render: (t) => <span className="text-ink-2">{t.assignee ?? 'Sem atendente'}</span> },
  {
    key: 'sla',
    header: 'SLA',
    align: 'right',
    width: '170px',
    render: (t) => (
      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-ink-3">{t.slaLabel}</span>
        <SlaBadge value={t.sla} />
      </div>
    ),
  },
];

const selectClass =
  'h-9 rounded-lg border border-line bg-panel px-3 text-[13px] text-ink focus:border-line-strong';

export function TicketsView() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<TicketStatus | ''>('');
  const [priority, setPriority] = useState<Priority | ''>('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return DEMO_TICKETS.filter(
      (t) =>
        (!status || t.status === status) &&
        (!priority || t.priority === priority) &&
        (!q || t.title.toLowerCase().includes(q) || String(t.number).includes(q) || t.requester.toLowerCase().includes(q)),
    );
  }, [query, status, priority]);

  return (
    <>
      <PageHeader
        title="Chamados"
        subtitle={`${rows.length} de ${DEMO_TICKETS.length} chamados`}
        actions={[
          { label: 'Compartilhar', icon: Share2 },
          { label: 'Exportar', icon: Download },
          { label: 'Tela cheia', icon: Maximize2 },
        ]}
      />
      <DemoNotice />
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar por título, número ou solicitante"
          aria-label="Filtrar chamados"
          className={`${selectClass} min-w-[260px] flex-1 placeholder:text-ink-3`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus | '')} aria-label="Status" className={selectClass}>
          <option value="">Todos os status</option>
          {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value as Priority | '')} aria-label="Prioridade" className={selectClass}>
          <option value="">Todas as prioridades</option>
          {(Object.keys(PRIORITY_LABEL) as Priority[]).map((p) => (
            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
          ))}
        </select>
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(t) => t.number} empty="Nenhum chamado com esses filtros" />
    </>
  );
}

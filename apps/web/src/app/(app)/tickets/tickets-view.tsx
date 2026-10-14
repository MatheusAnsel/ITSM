'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useUser } from '@/components/auth/auth-provider';
import { CategoryTile } from '@/components/ticket-category';
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui/badge';
import { type Column, DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/page-header';
import { Pagination } from '@/components/ui/pagination';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import { listCategories, listTickets, type TicketQuery } from '@/lib/api';
import { slaText } from '@/lib/format';
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels';
import { isStaff, PRIORITIES, type Priority, TICKET_STATUSES, type Ticket, type TicketStatus } from '@/lib/types';

const PER_PAGE = 15;

export function TicketsView() {
  const user = useUser();
  const staff = isStaff(user.role);
  const router = useRouter();
  const params = useSearchParams();

  const q = params.get('q') ?? '';
  const status = (params.get('status') ?? '') as TicketStatus | '';
  const priority = (params.get('priority') ?? '') as Priority | '';
  const categoryId = params.get('categoryId') ?? '';
  const mine = params.get('mine') === '1';
  const breached = params.get('breached') === '1';
  const page = Math.max(1, Number(params.get('page')) || 1);

  // O estado dos filtros vive na URL: dá para recarregar, compartilhar e usar o botão voltar.
  function update(changes: Record<string, string | undefined>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    if (!('page' in changes)) next.delete('page');
    const s = next.toString();
    router.replace(s ? `/tickets?${s}` : '/tickets', { scroll: false });
  }

  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);
  useEffect(() => {
    if (term.trim() === q) return;
    const t = setTimeout(() => update({ q: term.trim() || undefined }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const categories = useAsync(listCategories, []);
  const query: TicketQuery = {
    q: q || undefined,
    status,
    priority,
    categoryId: categoryId || undefined,
    assigneeId: staff && mine ? user.id : undefined,
    slaBreached: staff && breached ? true : undefined,
    page,
    perPage: PER_PAGE,
  };
  const tickets = useAsync(() => listTickets(query), [q, status, priority, categoryId, mine, breached, page]);

  const columns: Column<Ticket>[] = [
    {
      key: 'title',
      header: 'Chamado',
      render: (t) => (
        <Link href={`/tickets/${t.id}`} className="flex items-center gap-3 rounded-md focus-visible:outline-offset-4">
          <CategoryTile category={t.category.name} />
          <div className="min-w-0">
            <div className="max-w-[340px] truncate font-medium text-ink hover:underline">{t.title}</div>
            <div className="text-xs text-ink-3">
              #{t.number} · {t.category.name}
              {staff && ` · ${t.requester.name}`}
            </div>
          </div>
        </Link>
      ),
    },
    { key: 'priority', header: 'Prioridade', width: '110px', render: (t) => <PriorityBadge value={t.priority} /> },
    { key: 'status', header: 'Status', width: '160px', render: (t) => <StatusBadge value={t.status} /> },
    {
      key: 'assignee',
      header: 'Atendente',
      width: '140px',
      render: (t) => <span className="text-ink-2">{t.assignee?.name ?? 'Sem atendente'}</span>,
    },
    {
      key: 'sla',
      header: 'SLA',
      align: 'right',
      width: '190px',
      render: (t) => (
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-ink-3">{slaText(t)}</span>
          <SlaBadge value={t.sla.resolution} />
        </div>
      ),
    },
  ];

  const total = tickets.data?.total ?? 0;

  return (
    <>
      <PageHeader
        title={staff ? 'Chamados' : 'Meus chamados'}
        subtitle={tickets.data ? `${total} ${total === 1 ? 'chamado' : 'chamados'}` : undefined}
        actions={
          <Link
            href="/tickets/new"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-ask/70 bg-ask/10 px-4 text-[13px] font-medium hover:bg-ask/20"
          >
            <Plus size={14} className="text-ask" /> Novo chamado
          </Link>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Buscar por título ou descrição"
          aria-label="Buscar chamados"
          maxLength={100}
          className="min-w-[240px] flex-1"
        />
        <Select value={status} onChange={(e) => update({ status: e.target.value || undefined })} aria-label="Status" className="w-auto">
          <option value="">Todos os status</option>
          {TICKET_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </Select>
        <Select value={priority} onChange={(e) => update({ priority: e.target.value || undefined })} aria-label="Prioridade" className="w-auto">
          <option value="">Todas as prioridades</option>
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
          ))}
        </Select>
        <Select value={categoryId} onChange={(e) => update({ categoryId: e.target.value || undefined })} aria-label="Categoria" className="w-auto">
          <option value="">Todas as categorias</option>
          {categories.data?.filter((c) => c.active || c.id === categoryId).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        {staff && (
          <>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-[13px] text-ink-2">
              <input type="checkbox" checked={mine} onChange={(e) => update({ mine: e.target.checked ? '1' : undefined })} />
              Atribuídos a mim
            </label>
            <label className="flex h-9 items-center gap-2 rounded-lg border border-line bg-panel px-3 text-[13px] text-ink-2">
              <input type="checkbox" checked={breached} onChange={(e) => update({ breached: e.target.checked ? '1' : undefined })} />
              SLA violado
            </label>
          </>
        )}
      </div>

      {tickets.error ? (
        <ErrorState message={tickets.error} onRetry={tickets.reload} />
      ) : !tickets.data ? (
        <Loading />
      ) : (
        <div className={tickets.loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          <DataTable
            columns={columns}
            rows={tickets.data.items}
            rowKey={(t) => t.id}
            empty={q || status || priority || categoryId || mine || breached ? 'Nenhum chamado com esses filtros' : 'Nenhum chamado ainda'}
          />
          <Pagination page={page} pageSize={PER_PAGE} total={total} onChange={(p) => update({ page: p > 1 ? String(p) : undefined })} />
        </div>
      )}
    </>
  );
}

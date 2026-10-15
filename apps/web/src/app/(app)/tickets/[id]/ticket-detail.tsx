'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useUser } from '@/components/auth/auth-provider';
import { PriorityBadge, SlaBadge, StatusBadge } from '@/components/ui/badge';
import { Button, FormError, Select } from '@/components/ui/form';
import { ConfirmDialog } from '@/components/ui/dialog';
import { ErrorState, Loading } from '@/components/ui/states';
import { useAsync } from '@/hooks/use-async';
import {
  ApiError,
  assignTicket,
  changeTicketStatus,
  getAsset,
  getTicket,
  listAgents,
  listCategories,
  listComments,
  listHistory,
  updateTicket,
} from '@/lib/api';
import { formatDateTime, slaText } from '@/lib/format';
import { PRIORITY_LABEL, transitionLabel } from '@/lib/labels';
import { isStaff, PRIORITIES, type Priority, type Ticket, type TicketStatus } from '@/lib/types';
import { Attachments } from './attachments';
import { Comments } from './comments';
import { History } from './history';

const CONFIRM: Partial<Record<TicketStatus, { title: string; message: string; danger: boolean }>> = {
  CANCELLED: { title: 'Cancelar chamado', message: 'O chamado será encerrado como cancelado e não aceitará novas alterações.', danger: true },
  CLOSED: { title: 'Fechar chamado', message: 'O chamado será fechado e não aceitará novas alterações.', danger: false },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2.5 text-[13px] font-medium text-ink-2">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 text-[13px]">
      <dt className="shrink-0 text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-ink-2">{children}</dd>
    </div>
  );
}

export function TicketDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useUser();
  const staff = isStaff(user.role);

  const ticket = useAsync(() => getTicket(id), [id]);
  const comments = useAsync(() => listComments(id), [id]);
  const history = useAsync(() => listHistory(id), [id]);
  const categories = useAsync(listCategories, []);
  const agents = useAsync(() => (staff ? listAgents() : Promise.resolve([])), [staff]);
  const assetId = ticket.data?.assetId ?? null;
  const asset = useAsync(() => (staff && assetId ? getAsset(assetId) : Promise.resolve(null)), [staff, assetId]);

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<TicketStatus | null>(null);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    agents.data?.forEach((a) => map.set(a.id, a.name));
    categories.data?.forEach((c) => map.set(c.id, c.name));
    if (ticket.data) {
      map.set(ticket.data.requester.id, ticket.data.requester.name);
      if (ticket.data.assignee) map.set(ticket.data.assignee.id, ticket.data.assignee.name);
    }
    history.data?.forEach((h) => map.set(h.actor.id, h.actor.name));
    return map;
  }, [agents.data, categories.data, ticket.data, history.data]);

  if (ticket.error) {
    return (
      <>
        <BackLink />
        <ErrorState message={ticket.errorStatus === 404 ? 'Chamado não encontrado' : ticket.error} onRetry={ticket.reload} />
      </>
    );
  }
  if (!ticket.data) return <Loading />;
  const t = ticket.data;

  const refresh = () => {
    ticket.reload();
    comments.reload();
    history.reload();
  };

  async function run(action: () => Promise<Ticket>) {
    setActionError(null);
    setBusy(true);
    try {
      await action();
      refresh();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Erro inesperado');
    } finally {
      setBusy(false);
      setConfirming(null);
    }
  }

  const terminal = t.status === 'CLOSED' || t.status === 'CANCELLED';
  const canAssignOthers = user.role === 'MANAGER' || user.role === 'ADMIN';
  const category = categories.data?.find((c) => c.id === t.category.id);

  return (
    <>
      <BackLink />
      <header className="mb-5">
        <div className="mb-1 text-xs text-ink-3">#{t.number}</div>
        <h1 className="text-[22px] font-semibold leading-snug tracking-tight">{t.title}</h1>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusBadge value={t.status} />
          <PriorityBadge value={t.priority} />
          <SlaBadge value={t.sla.resolution} />
          <span className="text-xs text-ink-3">{slaText(t)}</span>
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0">
          <Section title="Descrição">
            <p className="whitespace-pre-wrap break-words text-[13.5px] leading-relaxed text-ink-2">{t.description}</p>
          </Section>

          <Section title="Anexos">
            <Attachments ticketId={t.id} canUpload={!terminal} />
          </Section>

          <Section title="Comentários">
            {comments.error ? (
              <ErrorState message={comments.error} onRetry={comments.reload} />
            ) : (
              <Comments
                ticketId={t.id}
                items={comments.data ?? []}
                staff={staff}
                canComment={!terminal}
                onAdded={refresh}
              />
            )}
          </Section>

          <Section title="Histórico">
            {history.data ? <History items={history.data} names={names} /> : <Loading />}
          </Section>
        </div>

        <aside className="space-y-5">
          {t.allowedTransitions.length > 0 && (
            <div className="space-y-2 rounded-lg border border-line bg-panel p-4">
              <h2 className="text-[13px] font-medium text-ink-2">Ações</h2>
              <div className="flex flex-col gap-1.5">
                {t.allowedTransitions.map((to) => (
                  <Button
                    key={to}
                    variant={to === 'CANCELLED' ? 'danger' : to === 'RESOLVED' ? 'primary' : 'secondary'}
                    disabled={busy}
                    onClick={() => (CONFIRM[to] ? setConfirming(to) : void run(() => changeTicketStatus(t.id, to)))}
                  >
                    {transitionLabel(t.status, to)}
                  </Button>
                ))}
              </div>
              <FormError message={actionError} />
            </div>
          )}
          {t.allowedTransitions.length === 0 && actionError && <FormError message={actionError} />}

          <dl className="divide-y divide-line rounded-lg border border-line bg-panel px-4 py-2">
            <Row label="Solicitante">{t.requester.name}</Row>
            <Row label="Categoria">
              {staff && !terminal && categories.data ? (
                <Select
                  aria-label="Categoria"
                  value={t.category.id}
                  disabled={busy}
                  onChange={(e) => void run(() => updateTicket(t.id, { categoryId: e.target.value }))}
                  className="h-8 w-[170px] text-xs"
                >
                  {categories.data
                    .filter((c) => c.active || c.id === t.category.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                </Select>
              ) : (
                (category?.name ?? t.category.name)
              )}
            </Row>
            <Row label="Prioridade">
              {staff && !terminal ? (
                <Select
                  aria-label="Prioridade"
                  value={t.priority}
                  disabled={busy}
                  onChange={(e) => void run(() => updateTicket(t.id, { priority: e.target.value as Priority }))}
                  className="h-8 w-[170px] text-xs"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
                  ))}
                </Select>
              ) : (
                PRIORITY_LABEL[t.priority]
              )}
            </Row>
            <Row label="Atendente">
              {staff && !terminal ? (
                canAssignOthers ? (
                  <Select
                    aria-label="Atendente"
                    value={t.assignee?.id ?? ''}
                    disabled={busy || !agents.data}
                    onChange={(e) => e.target.value && void run(() => assignTicket(t.id, e.target.value))}
                    className="h-8 w-[170px] text-xs"
                  >
                    {!t.assignee && <option value="">Sem atendente</option>}
                    {agents.data?.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </Select>
                ) : t.assignee?.id === user.id ? (
                  user.name
                ) : (
                  <span className="inline-flex flex-col items-end gap-1">
                    {t.assignee?.name ?? 'Sem atendente'}
                    <Button size="sm" disabled={busy} onClick={() => void run(() => assignTicket(t.id, user.id))}>
                      Assumir
                    </Button>
                  </span>
                )
              ) : (
                (t.assignee?.name ?? 'Sem atendente')
              )}
            </Row>
            {staff && asset.data && (
              <Row label="Ativo">
                <Link href={`/assets/${asset.data.id}`} className="text-info hover:underline">
                  {asset.data.tag}
                </Link>
              </Row>
            )}
          </dl>

          <dl className="divide-y divide-line rounded-lg border border-line bg-panel px-4 py-2">
            <Row label="Aberto em">{formatDateTime(t.createdAt)}</Row>
            <Row label="1ª resposta até">
              {t.firstRespondedAt ? `Feita ${formatDateTime(t.firstRespondedAt)}` : formatDateTime(t.responseDueAt)}
              {!t.firstRespondedAt && t.sla.responseBreached && <span className="ml-1 text-bad">(vencida)</span>}
            </Row>
            <Row label="Resolução até">{t.slaPausedAt ? 'Prazo pausado' : formatDateTime(t.resolutionDueAt)}</Row>
            {t.resolvedAt && <Row label="Resolvido em">{formatDateTime(t.resolvedAt)}</Row>}
            {t.closedAt && <Row label="Fechado em">{formatDateTime(t.closedAt)}</Row>}
          </dl>
        </aside>
      </div>

      {confirming && CONFIRM[confirming] && (
        <ConfirmDialog
          open
          title={CONFIRM[confirming].title}
          message={CONFIRM[confirming].message}
          confirmLabel={transitionLabel(t.status, confirming)}
          danger={CONFIRM[confirming].danger}
          busy={busy}
          onConfirm={() => void run(() => changeTicketStatus(t.id, confirming))}
          onClose={() => setConfirming(null)}
        />
      )}
    </>
  );
}

function BackLink() {
  return (
    <Link href="/tickets" className="mb-3 inline-flex items-center gap-1.5 text-xs text-ink-3 hover:text-ink">
      <ArrowLeft size={13} /> Chamados
    </Link>
  );
}

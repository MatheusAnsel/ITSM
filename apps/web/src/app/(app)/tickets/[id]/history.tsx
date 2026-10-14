import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/labels';
import { formatDateTime } from '@/lib/format';
import type { Priority, TicketHistory, TicketStatus } from '@/lib/types';

// Valores de usuário/categoria chegam como id: traduz pelos mapas que a tela já carregou.
export function describeHistory(h: TicketHistory, names: Map<string, string>): string {
  const name = (id: string | null) => (id ? (names.get(id) ?? 'outro registro') : 'ninguém');
  switch (h.action) {
    case 'CREATED':
      return 'abriu o chamado';
    case 'STATUS_CHANGED':
      return `alterou o status de ${STATUS_LABEL[h.fromValue as TicketStatus] ?? h.fromValue} para ${STATUS_LABEL[h.toValue as TicketStatus] ?? h.toValue}`;
    case 'PRIORITY_CHANGED':
      return `alterou a prioridade de ${PRIORITY_LABEL[h.fromValue as Priority] ?? h.fromValue} para ${PRIORITY_LABEL[h.toValue as Priority] ?? h.toValue}`;
    case 'ASSIGNEE_CHANGED':
      return h.fromValue ? `trocou o atendente de ${name(h.fromValue)} para ${name(h.toValue)}` : `atribuiu o chamado a ${name(h.toValue)}`;
    case 'CATEGORY_CHANGED':
      return `mudou a categoria de ${name(h.fromValue)} para ${name(h.toValue)}`;
    case 'TITLE_CHANGED':
      return `renomeou o chamado para “${h.toValue ?? ''}”`;
    case 'ASSET_CHANGED':
      return h.toValue ? 'vinculou um ativo' : 'removeu o vínculo com o ativo';
    default:
      return h.action.toLowerCase().replaceAll('_', ' ');
  }
}

export function History({ items, names }: { items: TicketHistory[]; names: Map<string, string> }) {
  return (
    <ol className="space-y-3 border-l border-line pl-4">
      {items.map((h) => (
        <li key={h.id} className="relative text-[13px]">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full border border-line-strong bg-panel-2" aria-hidden />
          <p className="text-ink-2">
            <span className="font-medium text-ink">{h.actor.name}</span> {describeHistory(h, names)}
          </p>
          <time dateTime={h.createdAt} className="text-xs text-ink-3">
            {formatDateTime(h.createdAt)}
          </time>
        </li>
      ))}
    </ol>
  );
}

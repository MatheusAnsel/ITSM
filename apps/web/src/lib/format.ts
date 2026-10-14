import type { Ticket } from './types';

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const dateOnly = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeZone: 'UTC' });

export const formatDateTime = (iso: string): string => dateTime.format(new Date(iso));
// Datas de compra são só dia, sem horário: UTC evita voltar um dia por fuso.
export const formatDate = (iso: string): string => dateOnly.format(new Date(iso));

export function formatDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0).replace('.', ',')} h`;
  return `${Math.round(hours / 24)} d`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// Texto curto do prazo de resolução: "Vence em 3 h", "Venceu há 2 h", "Pausado".
export function slaText(t: Pick<Ticket, 'resolutionDueAt' | 'slaPausedAt' | 'resolvedAt' | 'status'>, now = Date.now()): string {
  if (t.resolvedAt || t.status === 'CLOSED') return 'Concluído';
  if (t.status === 'CANCELLED') return '—';
  if (t.slaPausedAt) return 'Pausado';
  const diff = new Date(t.resolutionDueAt).getTime() - now;
  const label = formatDuration(Math.abs(diff) / 60000);
  return diff >= 0 ? `Vence em ${label}` : `Venceu há ${label}`;
}

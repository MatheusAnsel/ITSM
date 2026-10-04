import { isStaff, RoleName } from '../../common/roles';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

// RN-02
export const STATUS_TRANSITIONS: Readonly<Record<TicketStatus, readonly TicketStatus[]>> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_USER', 'RESOLVED', 'CANCELLED'],
  WAITING_USER: ['IN_PROGRESS', 'CANCELLED'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: [],
  CANCELLED: [],
};

export function allowedTransitions(from: TicketStatus): readonly TicketStatus[] {
  return STATUS_TRANSITIONS[from];
}

export function isValidTransition(from: TicketStatus, to: TicketStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to);
}

export interface TransitionContext {
  role: RoleName;
  actorId: string;
  requesterId: string;
}

// Permissões da matriz da seção 3 aplicadas às transições da RN-02.
// Devolve null se permitido, ou o motivo da recusa.
export function checkTransitionPermission(
  from: TicketStatus,
  to: TicketStatus,
  ctx: TransitionContext,
): string | null {
  if (!isValidTransition(from, to)) {
    const allowed = allowedTransitions(from);
    return allowed.length === 0
      ? `Chamado em ${from} não aceita novas mudanças de status`
      : `Transição inválida de ${from} para ${to}. Permitidas: ${allowed.join(', ')}`;
  }
  if (isStaff(ctx.role)) return null;

  // Solicitante: cancela o próprio chamado aberto e reabre o próprio resolvido.
  const isOwner = ctx.actorId === ctx.requesterId;
  if (isOwner && from === 'OPEN' && to === 'CANCELLED') return null;
  if (isOwner && from === 'RESOLVED' && to === 'IN_PROGRESS') return null;
  return 'Sem permissão para esta mudança de status';
}

// RN-07
export const AUTO_CLOSE_DAYS = 3;

export function shouldAutoClose(status: TicketStatus, resolvedAt: Date | null, now: Date): boolean {
  if (status !== 'RESOLVED' || !resolvedAt) return false;
  return now.getTime() - resolvedAt.getTime() >= AUTO_CLOSE_DAYS * 24 * 60 * 60 * 1000;
}

// RN-04
export interface SlaPolicyMinutes {
  firstResponseMinutes: number;
  resolutionMinutes: number;
}

export const DEFAULT_SLA: Readonly<Record<Priority, SlaPolicyMinutes>> = {
  CRITICAL: { firstResponseMinutes: 15, resolutionMinutes: 4 * 60 },
  HIGH: { firstResponseMinutes: 60, resolutionMinutes: 8 * 60 },
  MEDIUM: { firstResponseMinutes: 4 * 60, resolutionMinutes: 24 * 60 },
  LOW: { firstResponseMinutes: 8 * 60, resolutionMinutes: 72 * 60 },
};

const MINUTE = 60_000;
const addMinutes = (date: Date, minutes: number): Date => new Date(date.getTime() + minutes * MINUTE);

export function computeDueDates(createdAt: Date, policy: SlaPolicyMinutes) {
  return {
    responseDueAt: addMinutes(createdAt, policy.firstResponseMinutes),
    resolutionDueAt: addMinutes(createdAt, policy.resolutionMinutes),
  };
}

// Mudança de prioridade: os vencimentos passam a refletir a nova política a
// partir da abertura. Aplicar a diferença entre as políticas preserva o tempo
// de pausa já somado ao vencimento de resolução (RN-04 e RN-05).
export function recalculateDueDates(
  current: { responseDueAt: Date; resolutionDueAt: Date },
  oldPolicy: SlaPolicyMinutes,
  newPolicy: SlaPolicyMinutes,
) {
  return {
    responseDueAt: addMinutes(current.responseDueAt, newPolicy.firstResponseMinutes - oldPolicy.firstResponseMinutes),
    resolutionDueAt: addMinutes(current.resolutionDueAt, newPolicy.resolutionMinutes - oldPolicy.resolutionMinutes),
  };
}

// RN-05: ao sair de WAITING_USER, soma o tempo parado ao vencimento.
export function applyPauseTransition(params: {
  from: TicketStatus;
  to: TicketStatus;
  now: Date;
  slaPausedAt: Date | null;
  resolutionDueAt: Date;
}): { slaPausedAt: Date | null; resolutionDueAt: Date } {
  const { from, to, now, slaPausedAt, resolutionDueAt } = params;
  if (to === 'WAITING_USER' && from !== 'WAITING_USER') {
    return { slaPausedAt: now, resolutionDueAt };
  }
  if (from === 'WAITING_USER' && to !== 'WAITING_USER' && slaPausedAt) {
    const paused = Math.max(0, now.getTime() - slaPausedAt.getTime());
    return { slaPausedAt: null, resolutionDueAt: new Date(resolutionDueAt.getTime() + paused) };
  }
  return { slaPausedAt, resolutionDueAt };
}

// RN-06: primeira resposta é ação de equipe: comentário público ou ida para IN_PROGRESS.
export function countsAsFirstResponse(event: {
  actorRole: RoleName;
  kind: 'COMMENT' | 'STATUS_CHANGE';
  internal?: boolean;
  toStatus?: TicketStatus;
}): boolean {
  if (!isStaff(event.actorRole)) return false;
  if (event.kind === 'COMMENT') return event.internal !== true;
  return event.toStatus === 'IN_PROGRESS';
}

// RN-08
export interface SlaSnapshot {
  responseDueAt: Date;
  resolutionDueAt: Date;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  slaPausedAt: Date | null;
}

export function isResponseBreached(t: SlaSnapshot, now: Date): boolean {
  const reference = t.firstRespondedAt ?? now;
  return reference.getTime() > t.responseDueAt.getTime();
}

export function isResolutionBreached(t: SlaSnapshot, now: Date): boolean {
  if (t.resolvedAt) return t.resolvedAt.getTime() > t.resolutionDueAt.getTime();
  // Relógio pausado: o prazo está congelado, então o tempo corrente não conta.
  const reference = t.slaPausedAt ?? now;
  return reference.getTime() > t.resolutionDueAt.getTime();
}

export type SlaIndicator = 'OK' | 'AT_RISK' | 'BREACHED';

// RF-23: "próximo do vencimento" = restam 20% ou menos do prazo total.
export const AT_RISK_FRACTION = 0.2;

export function resolutionIndicator(t: SlaSnapshot & { createdAt: Date }, now: Date): SlaIndicator {
  if (isResolutionBreached(t, now)) return 'BREACHED';
  if (t.resolvedAt) return 'OK';
  const reference = t.slaPausedAt ?? now;
  const total = t.resolutionDueAt.getTime() - t.createdAt.getTime();
  const remaining = t.resolutionDueAt.getTime() - reference.getTime();
  return total > 0 && remaining / total <= AT_RISK_FRACTION ? 'AT_RISK' : 'OK';
}

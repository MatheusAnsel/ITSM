import {
  applyPauseTransition,
  checkTransitionPermission,
  computeDueDates,
  countsAsFirstResponse,
  DEFAULT_SLA,
  isResolutionBreached,
  isResponseBreached,
  isValidTransition,
  recalculateDueDates,
  resolutionIndicator,
  shouldAutoClose,
  STATUS_TRANSITIONS,
  TicketStatus,
} from './ticket.rules';

const t0 = new Date('2026-03-02T09:00:00Z');
const plus = (d: Date, min: number) => new Date(d.getTime() + min * 60_000);

describe('fluxo de status (RN-02)', () => {
  it('aceita só as transições da tabela', () => {
    const all = Object.keys(STATUS_TRANSITIONS) as TicketStatus[];
    let valid = 0;
    for (const from of all) for (const to of all) if (isValidTransition(from, to)) valid++;
    expect(valid).toBe(9);
    expect(isValidTransition('OPEN', 'RESOLVED')).toBe(false);
    expect(isValidTransition('RESOLVED', 'IN_PROGRESS')).toBe(true);
  });

  it('estados finais não aceitam nada', () => {
    expect(checkTransitionPermission('CLOSED', 'IN_PROGRESS', { role: 'ADMIN', actorId: 'a', requesterId: 'r' })).toMatch(/não aceita/);
    expect(checkTransitionPermission('CANCELLED', 'OPEN', { role: 'AGENT', actorId: 'a', requesterId: 'r' })).toMatch(/não aceita/);
  });

  it('lista as transições permitidas na recusa', () => {
    expect(checkTransitionPermission('OPEN', 'RESOLVED', { role: 'AGENT', actorId: 'a', requesterId: 'r' })).toContain('IN_PROGRESS, CANCELLED');
  });

  it('equipe pode qualquer transição válida', () => {
    for (const role of ['AGENT', 'MANAGER', 'ADMIN'] as const) {
      expect(checkTransitionPermission('IN_PROGRESS', 'RESOLVED', { role, actorId: 'a', requesterId: 'r' })).toBeNull();
    }
  });

  it('solicitante só cancela o próprio chamado aberto e reabre o próprio resolvido', () => {
    const own = { role: 'REQUESTER' as const, actorId: 'r', requesterId: 'r' };
    const other = { role: 'REQUESTER' as const, actorId: 'x', requesterId: 'r' };
    expect(checkTransitionPermission('OPEN', 'CANCELLED', own)).toBeNull();
    expect(checkTransitionPermission('RESOLVED', 'IN_PROGRESS', own)).toBeNull();
    expect(checkTransitionPermission('IN_PROGRESS', 'CANCELLED', own)).not.toBeNull();
    expect(checkTransitionPermission('IN_PROGRESS', 'RESOLVED', own)).not.toBeNull();
    expect(checkTransitionPermission('OPEN', 'CANCELLED', other)).not.toBeNull();
  });
});

describe('fechamento automático (RN-07)', () => {
  it('fecha após 3 dias em RESOLVED', () => {
    expect(shouldAutoClose('RESOLVED', t0, plus(t0, 3 * 24 * 60 - 1))).toBe(false);
    expect(shouldAutoClose('RESOLVED', t0, plus(t0, 3 * 24 * 60))).toBe(true);
    expect(shouldAutoClose('IN_PROGRESS', t0, plus(t0, 10 * 24 * 60))).toBe(false);
    expect(shouldAutoClose('RESOLVED', null, plus(t0, 10 * 24 * 60))).toBe(false);
  });
});

describe('SLA (RN-04, RN-05)', () => {
  it('calcula vencimentos pela política padrão', () => {
    const due = computeDueDates(t0, DEFAULT_SLA.CRITICAL);
    expect(due.responseDueAt).toEqual(plus(t0, 15));
    expect(due.resolutionDueAt).toEqual(plus(t0, 240));
    expect(computeDueDates(t0, DEFAULT_SLA.LOW).resolutionDueAt).toEqual(plus(t0, 72 * 60));
  });

  it('pausa em WAITING_USER e soma o tempo parado ao sair', () => {
    const due = plus(t0, 480);
    const paused = applyPauseTransition({ from: 'IN_PROGRESS', to: 'WAITING_USER', now: plus(t0, 60), slaPausedAt: null, resolutionDueAt: due });
    expect(paused).toEqual({ slaPausedAt: plus(t0, 60), resolutionDueAt: due });
    const resumed = applyPauseTransition({ from: 'WAITING_USER', to: 'IN_PROGRESS', now: plus(t0, 150), slaPausedAt: paused.slaPausedAt, resolutionDueAt: due });
    expect(resumed).toEqual({ slaPausedAt: null, resolutionDueAt: plus(due, 90) });
  });

  it('cancelar de WAITING_USER também encerra a pausa; outras transições não mexem', () => {
    const due = plus(t0, 480);
    const r = applyPauseTransition({ from: 'WAITING_USER', to: 'CANCELLED', now: plus(t0, 100), slaPausedAt: plus(t0, 40), resolutionDueAt: due });
    expect(r.slaPausedAt).toBeNull();
    const same = applyPauseTransition({ from: 'OPEN', to: 'IN_PROGRESS', now: plus(t0, 5), slaPausedAt: null, resolutionDueAt: due });
    expect(same).toEqual({ slaPausedAt: null, resolutionDueAt: due });
  });

  it('mudança de prioridade preserva o tempo de pausa já somado', () => {
    const base = computeDueDates(t0, DEFAULT_SLA.MEDIUM);
    const withPause = { ...base, resolutionDueAt: plus(base.resolutionDueAt, 90) };
    const next = recalculateDueDates(withPause, DEFAULT_SLA.MEDIUM, DEFAULT_SLA.HIGH);
    expect(next.responseDueAt).toEqual(plus(t0, 60));
    expect(next.resolutionDueAt).toEqual(plus(t0, 8 * 60 + 90));
  });
});

describe('primeira resposta (RN-06)', () => {
  it('conta comentário público e ida para IN_PROGRESS pela equipe', () => {
    expect(countsAsFirstResponse({ actorRole: 'AGENT', kind: 'COMMENT' })).toBe(true);
    expect(countsAsFirstResponse({ actorRole: 'AGENT', kind: 'STATUS_CHANGE', toStatus: 'IN_PROGRESS' })).toBe(true);
  });
  it('não conta comentário interno, do solicitante ou outras mudanças', () => {
    expect(countsAsFirstResponse({ actorRole: 'AGENT', kind: 'COMMENT', internal: true })).toBe(false);
    expect(countsAsFirstResponse({ actorRole: 'REQUESTER', kind: 'COMMENT' })).toBe(false);
    expect(countsAsFirstResponse({ actorRole: 'AGENT', kind: 'STATUS_CHANGE', toStatus: 'CANCELLED' })).toBe(false);
  });
});

describe('violação de SLA (RN-08)', () => {
  const base = { responseDueAt: plus(t0, 60), resolutionDueAt: plus(t0, 480), firstRespondedAt: null, resolvedAt: null, slaPausedAt: null };

  it('resposta: respondido a tempo, atrasado, ou sem resposta após o prazo', () => {
    expect(isResponseBreached({ ...base, firstRespondedAt: plus(t0, 59) }, plus(t0, 999))).toBe(false);
    expect(isResponseBreached({ ...base, firstRespondedAt: plus(t0, 61) }, plus(t0, 999))).toBe(true);
    expect(isResponseBreached(base, plus(t0, 30))).toBe(false);
    expect(isResponseBreached(base, plus(t0, 61))).toBe(true);
  });

  it('resolução: resolvido ou não, e relógio pausado não estoura', () => {
    expect(isResolutionBreached({ ...base, resolvedAt: plus(t0, 400) }, plus(t0, 999))).toBe(false);
    expect(isResolutionBreached({ ...base, resolvedAt: plus(t0, 500) }, plus(t0, 999))).toBe(true);
    expect(isResolutionBreached(base, plus(t0, 481))).toBe(true);
    expect(isResolutionBreached({ ...base, slaPausedAt: plus(t0, 100) }, plus(t0, 9999))).toBe(false);
  });

  it('indicador: OK, em risco (<=20% restante) e violado', () => {
    const snap = { ...base, createdAt: t0 };
    expect(resolutionIndicator(snap, plus(t0, 100))).toBe('OK');
    expect(resolutionIndicator(snap, plus(t0, 400))).toBe('AT_RISK');
    expect(resolutionIndicator(snap, plus(t0, 481))).toBe('BREACHED');
    expect(resolutionIndicator({ ...snap, resolvedAt: plus(t0, 470) }, plus(t0, 999))).toBe('OK');
  });
});

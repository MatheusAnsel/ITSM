import { buildDemoTickets, DEMO_AGENTS, DEMO_REQUESTERS } from './seed-demo';

const NOW = new Date('2026-10-14T12:00:00Z');
const tickets = buildDemoTickets(NOW);

describe('chamados de demonstração', () => {
  it('é determinístico para a mesma semente e muda com outra', () => {
    expect(buildDemoTickets(NOW)).toEqual(tickets);
    expect(buildDemoTickets(NOW, 8)).not.toEqual(tickets);
  });

  it('gera o volume pedido, dentro dos últimos 30 dias e nunca no futuro', () => {
    expect(tickets).toHaveLength(48);
    for (const t of tickets) {
      expect(t.createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
      expect(NOW.getTime() - t.createdAt.getTime()).toBeLessThanOrEqual(30 * 86_400_000);
      for (const d of [t.firstRespondedAt, t.resolvedAt, t.closedAt, t.slaPausedAt]) {
        if (d) expect(d.getTime()).toBeLessThanOrEqual(NOW.getTime());
      }
      for (const e of [...t.history, ...t.comments]) expect(e.createdAt.getTime()).toBeLessThanOrEqual(NOW.getTime());
    }
  });

  it('cobre todos os status para o painel ter o que mostrar', () => {
    const statuses = new Set(tickets.map((t) => t.status));
    for (const s of ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED', 'CANCELLED']) {
      expect(statuses).toContain(s);
    }
    expect(new Set(tickets.map((t) => t.priority)).size).toBe(4);
  });

  it('mantém cada chamado coerente com o seu status', () => {
    for (const t of tickets) {
      const label = `${t.title} (${t.status})`;
      expect(t.resolutionDueAt.getTime()).toBeGreaterThan(t.responseDueAt.getTime());
      if (t.status === 'OPEN' || t.status === 'CANCELLED') {
        expect([label, t.assigneeKey]).toEqual([label, null]);
        expect(t.resolvedAt).toBeNull();
      } else {
        expect(DEMO_AGENTS).toContain(t.assigneeKey);
        expect(t.firstRespondedAt).not.toBeNull();
      }
      if (t.status === 'WAITING_USER') expect(t.slaPausedAt).not.toBeNull();
      else expect(t.slaPausedAt).toBeNull();
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        expect(t.resolvedAt).not.toBeNull();
        expect(t.resolvedAt!.getTime()).toBeGreaterThan(t.firstRespondedAt!.getTime());
      } else {
        expect(t.resolvedAt).toBeNull();
      }
      expect(t.closedAt !== null).toBe(t.status === 'CLOSED');
      expect(DEMO_REQUESTERS).toContain(t.requesterKey);
    }
  });

  it('o histórico está em ordem, começa na criação e termina no status atual', () => {
    for (const t of tickets) {
      expect(t.history[0]).toMatchObject({ action: 'CREATED', toValue: 'OPEN' });
      const times = t.history.map((h) => h.createdAt.getTime());
      expect(times).toEqual([...times].sort((a, b) => a - b));
      const lastStatus = [...t.history].reverse().find((h) => h.action === 'STATUS_CHANGED' || h.action === 'CREATED');
      expect(lastStatus?.toValue).toBe(t.status === 'OPEN' ? 'OPEN' : t.status);
    }
  });

  it('respeita a RN-07: nenhum chamado resolvido há mais de 3 dias segue aberto como RESOLVED', () => {
    for (const t of tickets.filter((x) => x.status === 'RESOLVED')) {
      expect(NOW.getTime() - t.resolvedAt!.getTime()).toBeLessThan(3 * 86_400_000);
    }
  });

  it('há chamados abertos já fora do prazo e outros dentro dele', () => {
    const open = tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
    expect(open.some((t) => t.resolutionDueAt < NOW)).toBe(true);
    expect(open.some((t) => t.resolutionDueAt > NOW)).toBe(true);
  });
});

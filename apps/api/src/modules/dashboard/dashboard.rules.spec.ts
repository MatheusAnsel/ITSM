import { MAX_RANGE_DAYS, percentage, resolveRange, roundMinutes } from './dashboard.rules';

const NOW = new Date('2026-10-09T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('dashboard.rules', () => {
  describe('resolveRange', () => {
    it('usa os últimos 30 dias até agora por padrão', () => {
      const { range } = resolveRange(undefined, undefined, NOW);
      expect(range?.to).toEqual(NOW);
      expect(range?.from.getTime()).toBe(NOW.getTime() - 30 * DAY);
    });
    it('conta os 30 dias a partir da data final informada', () => {
      const to = new Date('2026-09-01T00:00:00Z');
      expect(resolveRange(undefined, to, NOW).range?.from.getTime()).toBe(to.getTime() - 30 * DAY);
    });
    it('rejeita início depois do fim', () => {
      expect(resolveRange(new Date('2026-10-02'), new Date('2026-10-01'), NOW).error).toMatch(
        /posterior/,
      );
    });
    it('rejeita períodos acima do máximo e aceita o limite', () => {
      const to = new Date('2026-10-01T00:00:00Z');
      expect(
        resolveRange(new Date(to.getTime() - (MAX_RANGE_DAYS + 1) * DAY), to, NOW).error,
      ).toMatch(/máximo/);
      expect(
        resolveRange(new Date(to.getTime() - MAX_RANGE_DAYS * DAY), to, NOW).range,
      ).toBeDefined();
    });
  });

  describe('percentage', () => {
    it('arredonda para uma casa decimal', () => {
      expect(percentage(2, 3)).toBe(66.7);
      expect(percentage(1, 1)).toBe(100);
      expect(percentage(0, 4)).toBe(0);
    });
    it('devolve null sem base de cálculo', () => {
      expect(percentage(0, 0)).toBeNull();
    });
  });

  it('roundMinutes arredonda e preserva null', () => {
    expect(roundMinutes(59.6)).toBe(60);
    expect(roundMinutes(null)).toBeNull();
  });
});

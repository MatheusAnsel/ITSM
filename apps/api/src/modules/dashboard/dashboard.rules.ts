export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface DateRange {
  from: Date;
  to: Date;
}

// Período padrão: últimos 30 dias até agora. Devolve erro de validação em texto, se houver.
export function resolveRange(
  from: Date | undefined,
  to: Date | undefined,
  now: Date,
): { range?: DateRange; error?: string } {
  const end = to ?? now;
  const start = from ?? new Date(end.getTime() - DEFAULT_RANGE_DAYS * DAY_MS);
  if (start.getTime() > end.getTime())
    return { error: 'A data inicial não pode ser posterior à final' };
  if (end.getTime() - start.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    return { error: `O período máximo é de ${MAX_RANGE_DAYS} dias` };
  }
  return { range: { from: start, to: end } };
}

// Percentual com uma casa decimal; null quando não há base de cálculo.
export function percentage(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1000) / 10;
}

export function roundMinutes(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}

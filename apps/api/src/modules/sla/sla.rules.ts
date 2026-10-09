export const MAX_SLA_MINUTES = 60 * 24 * 365;

// RN-04: tempos em minutos corridos. A primeira resposta não pode vencer depois da resolução.
export function validateSlaPolicy(
  firstResponseMinutes: number,
  resolutionMinutes: number,
): string[] {
  const errors: string[] = [];
  if (firstResponseMinutes > resolutionMinutes) {
    errors.push('O prazo de primeira resposta não pode ser maior que o de resolução');
  }
  return errors;
}

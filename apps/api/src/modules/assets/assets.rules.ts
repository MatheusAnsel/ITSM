export const ASSET_TYPES = [
  'NOTEBOOK',
  'DESKTOP',
  'MONITOR',
  'PRINTER',
  'PHONE',
  'NETWORK',
  'SERVER',
  'OTHER',
] as const;
export const ASSET_STATUSES = ['IN_STOCK', 'IN_USE', 'MAINTENANCE', 'RETIRED'] as const;

export type AssetTypeName = (typeof ASSET_TYPES)[number];
export type AssetStatusName = (typeof ASSET_STATUSES)[number];

// O patrimônio é comparado sempre em caixa alta e sem espaços nas pontas (RN-09).
export function normalizeTag(tag: string): string {
  return tag.trim().toUpperCase();
}

// RN-09: ativo IN_USE exige responsável; ativo RETIRED não pode ter responsável.
export function validateAssetState(status: AssetStatusName, assignedToId: string | null): string[] {
  const errors: string[] = [];
  if (status === 'IN_USE' && !assignedToId) errors.push('Ativo em uso exige um responsável');
  if (status === 'RETIRED' && assignedToId)
    errors.push('Ativo aposentado não pode ter responsável');
  return errors;
}

// Ao aposentar um ativo sem informar responsável, o vínculo atual é removido.
export function resolveAssignee(
  nextStatus: AssetStatusName,
  current: string | null,
  requested: string | null | undefined,
): string | null {
  if (nextStatus === 'RETIRED' && requested === undefined) return null;
  return requested === undefined ? current : requested;
}

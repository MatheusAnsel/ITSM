// Espelha o enum Role do schema Prisma, mantido aqui para que as regras
// puras não dependam do client gerado (RNF-07).
export const ROLES = ['ADMIN', 'MANAGER', 'AGENT', 'REQUESTER'] as const;
export type RoleName = (typeof ROLES)[number];

export const STAFF_ROLES: readonly RoleName[] = ['AGENT', 'MANAGER', 'ADMIN'];

export function isStaff(role: RoleName): boolean {
  return STAFF_ROLES.includes(role);
}

export function hasAnyRole(role: RoleName, allowed: readonly RoleName[]): boolean {
  return allowed.includes(role);
}

// RN-03: só usuário ativo com perfil de atendimento pode receber chamado.
export function canBeAssignee(user: { role: RoleName; active: boolean }): boolean {
  return user.active && isStaff(user.role);
}

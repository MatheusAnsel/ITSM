import type { RoleName } from '../../common/roles';

export interface UserChange {
  role?: RoleName;
  active?: boolean;
}

// Impede o administrador de se trancar para fora e de deixar o sistema
// sem nenhum administrador ativo.
export function validateAdminSafety(params: {
  actorId: string;
  target: { id: string; role: RoleName; active: boolean };
  change: UserChange;
  activeAdminCount: number;
}): string | null {
  const { actorId, target, change, activeAdminCount } = params;
  const newRole = change.role ?? target.role;
  const newActive = change.active ?? target.active;
  const losesAdmin = target.role === 'ADMIN' && target.active && (newRole !== 'ADMIN' || !newActive);

  if (target.id === actorId && (newRole !== target.role || newActive !== target.active)) {
    return 'Você não pode alterar o próprio perfil ou a própria situação';
  }
  if (losesAdmin && activeAdminCount <= 1) {
    return 'O sistema precisa manter ao menos um administrador ativo';
  }
  return null;
}

export function pageOffset(page: number, pageSize: number): number {
  return (page - 1) * pageSize;
}

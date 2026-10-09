import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditRequest {
  user?: { id: string };
  params: Record<string, string | undefined>;
  body?: unknown;
  ip?: string;
}

export interface AuditOptions {
  action: string;
  entity: string;
  // De onde sai o id da entidade afetada.
  entityId?: (req: AuditRequest, result: unknown) => string | undefined;
  // Autor quando a rota não é autenticada (cadastro e login).
  actorId?: (req: AuditRequest, result: unknown) => string | undefined;
  // Metadados extras, sem dados sensíveis.
  extra?: (req: AuditRequest) => Record<string, unknown>;
  // Ação gravada quando a rota falha (por exemplo, falha de login).
  failureAction?: string;
}

export const Audit = (options: AuditOptions): MethodDecorator => SetMetadata(AUDIT_KEY, options);

export const fromParam =
  (name = 'id') =>
  (req: AuditRequest): string | undefined =>
    req.params[name];

export const fromResult =
  (path = 'id') =>
  (_req: AuditRequest, result: unknown): string | undefined => {
    let cur: unknown = result;
    for (const key of path.split('.')) {
      if (!cur || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[key];
    }
    return typeof cur === 'string' ? cur : undefined;
  };

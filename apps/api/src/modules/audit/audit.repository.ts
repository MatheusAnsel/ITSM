export interface AuditEntry {
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
}

export interface AuditView extends AuditEntry {
  id: string;
  actor: { id: string; name: string } | null;
  createdAt: Date;
}

export interface AuditFilter {
  actorId?: string;
  action?: string;
  entity?: string;
  entityId?: string;
  from?: Date;
  to?: Date;
  skip: number;
  take: number;
}

export abstract class AuditRepository {
  abstract create(entry: AuditEntry): Promise<void>;
  abstract list(filter: AuditFilter): Promise<{ items: AuditView[]; total: number }>;
}

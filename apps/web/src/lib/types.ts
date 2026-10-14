// Formatos devolvidos pela API (datas chegam como string ISO).
export type Role = 'ADMIN' | 'MANAGER' | 'AGENT' | 'REQUESTER';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type SlaIndicator = 'OK' | 'AT_RISK' | 'BREACHED';
export type AssetType = 'NOTEBOOK' | 'DESKTOP' | 'MONITOR' | 'PRINTER' | 'PHONE' | 'NETWORK' | 'SERVER' | 'OTHER';
export type AssetStatus = 'IN_STOCK' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';

export const ROLES: Role[] = ['ADMIN', 'MANAGER', 'AGENT', 'REQUESTER'];
export const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
export const TICKET_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED', 'CANCELLED'];
export const ASSET_TYPES: AssetType[] = ['NOTEBOOK', 'DESKTOP', 'MONITOR', 'PRINTER', 'PHONE', 'NETWORK', 'SERVER', 'OTHER'];
export const ASSET_STATUSES: AssetStatus[] = ['IN_STOCK', 'IN_USE', 'MAINTENANCE', 'RETIRED'];

export const isStaff = (role: Role): boolean => role !== 'REQUESTER';
export const isManager = (role: Role): boolean => role === 'MANAGER' || role === 'ADMIN';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface NamedRef {
  id: string;
  name: string;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  perPage?: number;
  pageSize?: number;
}

export interface Ticket {
  id: string;
  number: number;
  title: string;
  description: string;
  status: TicketStatus;
  priority: Priority;
  category: NamedRef;
  requester: NamedRef;
  assignee: NamedRef | null;
  assetId: string | null;
  responseDueAt: string;
  resolutionDueAt: string;
  slaPausedAt: string | null;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  sla: { responseBreached: boolean; resolution: SlaIndicator };
  allowedTransitions: TicketStatus[];
}

export interface TicketComment {
  id: string;
  body: string;
  internal: boolean;
  createdAt: string;
  author: NamedRef;
}

export interface TicketHistory {
  id: string;
  action: string;
  fromValue: string | null;
  toValue: string | null;
  createdAt: string;
  actor: NamedRef;
}

export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader: NamedRef;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
}

export interface Agent {
  id: string;
  name: string;
  role: Role;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Asset {
  id: string;
  tag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  serialNumber: string | null;
  purchaseDate: string | null;
  notes: string | null;
  assignedToId: string | null;
  assignedTo: NamedRef | null;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDetail extends Asset {
  tickets: Array<{ id: string; number: number; title: string; status: TicketStatus; priority: Priority; createdAt: string }>;
}

export interface SlaPolicy {
  priority: Priority;
  firstResponseMinutes: number;
  resolutionMinutes: number;
  customized: boolean;
  updatedAt: string | null;
}

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actor: NamedRef | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

export interface DashboardSummary {
  period: { from: string; to: string };
  byStatus: Record<TicketStatus, number>;
  byPriority: Record<Priority, number>;
  totalCreated: number;
  sla: {
    resolvedInPeriod: number;
    resolutionCompliancePercent: number | null;
    responseCompliancePercent: number | null;
    openBreached: number;
  };
  averages: { firstResponseMinutes: number | null; resolutionMinutes: number | null };
}

export interface CategoryStat {
  categoryId: string;
  name: string;
  total: number;
  open: number;
}

export interface AgentStat {
  agentId: string;
  name: string;
  open: number;
  resolved: number;
  avgResolutionMinutes: number | null;
}

export interface VolumeStat {
  day: string;
  created: number;
  resolved: number;
}

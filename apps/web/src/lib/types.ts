// Espelham os enums do schema Prisma da API.
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED' | 'CANCELLED';
export type SlaIndicator = 'OK' | 'AT_RISK' | 'BREACHED';
export type AssetType = 'NOTEBOOK' | 'DESKTOP' | 'MONITOR' | 'PRINTER' | 'PHONE' | 'NETWORK' | 'SERVER' | 'OTHER';
export type AssetStatus = 'IN_STOCK' | 'IN_USE' | 'MAINTENANCE' | 'RETIRED';

export interface TicketRow {
  number: number;
  title: string;
  category: string;
  priority: Priority;
  status: TicketStatus;
  requester: string;
  assignee: string | null;
  sla: SlaIndicator;
  slaLabel: string;
}

export interface AssetRow {
  tag: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  owner: string | null;
}

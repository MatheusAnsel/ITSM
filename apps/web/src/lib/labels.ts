import type { AssetStatus, AssetType, Priority, Role, SlaIndicator, TicketStatus } from './types';

export const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em atendimento',
  WAITING_USER: 'Aguardando usuário',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
  CANCELLED: 'Cancelado',
};

export const SLA_LABEL: Record<SlaIndicator, string> = {
  OK: 'No prazo',
  AT_RISK: 'Em risco',
  BREACHED: 'Violado',
};

export const ASSET_TYPE_LABEL: Record<AssetType, string> = {
  NOTEBOOK: 'Notebook',
  DESKTOP: 'Desktop',
  MONITOR: 'Monitor',
  PRINTER: 'Impressora',
  PHONE: 'Telefone',
  NETWORK: 'Rede',
  SERVER: 'Servidor',
  OTHER: 'Outro',
};

export const ASSET_STATUS_LABEL: Record<AssetStatus, string> = {
  IN_STOCK: 'Em estoque',
  IN_USE: 'Em uso',
  MAINTENANCE: 'Manutenção',
  RETIRED: 'Aposentado',
};

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  AGENT: 'Atendente',
  REQUESTER: 'Solicitante',
};

// Rótulo do botão que leva o chamado para cada status.
export const TRANSITION_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Reabrir',
  IN_PROGRESS: 'Em atendimento',
  WAITING_USER: 'Aguardar usuário',
  RESOLVED: 'Marcar como resolvido',
  CLOSED: 'Fechar chamado',
  CANCELLED: 'Cancelar chamado',
};

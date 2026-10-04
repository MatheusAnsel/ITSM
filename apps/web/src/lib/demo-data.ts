import type { AssetRow, TicketRow } from './types';

// Dados fictícios para a fase de interface. Serão substituídos pela API.
export const DEMO_TICKETS: TicketRow[] = [
  { number: 1042, title: 'VPN não conecta fora do escritório', category: 'Rede', priority: 'HIGH', status: 'IN_PROGRESS', requester: 'Ana Souza', assignee: 'Carlos Lima', sla: 'AT_RISK', slaLabel: 'vence em 1h20' },
  { number: 1041, title: 'Impressora do 3º andar sem toner', category: 'Impressão', priority: 'LOW', status: 'OPEN', requester: 'Bruno Alves', assignee: null, sla: 'OK', slaLabel: 'vence em 2d' },
  { number: 1040, title: 'Acesso negado ao sistema financeiro', category: 'Acessos', priority: 'CRITICAL', status: 'IN_PROGRESS', requester: 'Marina Costa', assignee: 'Paula Rocha', sla: 'BREACHED', slaLabel: 'venceu há 25min' },
  { number: 1039, title: 'Notebook com tela piscando', category: 'Hardware', priority: 'MEDIUM', status: 'WAITING_USER', requester: 'Diego Ramos', assignee: 'Carlos Lima', sla: 'OK', slaLabel: 'pausado' },
  { number: 1038, title: 'Instalar Office em máquina nova', category: 'Software', priority: 'LOW', status: 'RESOLVED', requester: 'Elisa Prado', assignee: 'Paula Rocha', sla: 'OK', slaLabel: 'cumprido' },
  { number: 1037, title: 'E-mail corporativo não sincroniza no celular', category: 'E-mail', priority: 'MEDIUM', status: 'IN_PROGRESS', requester: 'Fábio Nunes', assignee: 'Carlos Lima', sla: 'OK', slaLabel: 'vence em 9h' },
  { number: 1036, title: 'Wi-Fi instável na sala de reuniões', category: 'Rede', priority: 'HIGH', status: 'OPEN', requester: 'Gabriela Dias', assignee: null, sla: 'AT_RISK', slaLabel: 'vence em 45min' },
  { number: 1035, title: 'Reset de senha do ERP', category: 'Acessos', priority: 'MEDIUM', status: 'CLOSED', requester: 'Henrique Melo', assignee: 'Paula Rocha', sla: 'OK', slaLabel: 'cumprido' },
  { number: 1034, title: 'Monitor sem sinal na estação 14', category: 'Hardware', priority: 'LOW', status: 'RESOLVED', requester: 'Isabela Freitas', assignee: 'Carlos Lima', sla: 'OK', slaLabel: 'cumprido' },
  { number: 1033, title: 'Servidor de arquivos lento', category: 'Infraestrutura', priority: 'CRITICAL', status: 'RESOLVED', requester: 'João Pedro', assignee: 'Paula Rocha', sla: 'BREACHED', slaLabel: 'violado' },
  { number: 1032, title: 'Solicitação de acesso à pasta compartilhada', category: 'Acessos', priority: 'LOW', status: 'CANCELLED', requester: 'Karen Lopes', assignee: null, sla: 'OK', slaLabel: 'cancelado' },
  { number: 1031, title: 'Teclado com teclas falhando', category: 'Hardware', priority: 'LOW', status: 'OPEN', requester: 'Lucas Pires', assignee: null, sla: 'OK', slaLabel: 'vence em 3d' },
];

export const DEMO_ASSETS: AssetRow[] = [
  { tag: 'PAT-0001', name: 'Dell Latitude 5440', type: 'NOTEBOOK', status: 'IN_USE', owner: 'Ana Souza' },
  { tag: 'PAT-0002', name: 'Dell Latitude 5440', type: 'NOTEBOOK', status: 'IN_USE', owner: 'Diego Ramos' },
  { tag: 'PAT-0014', name: 'Dell P2422H 24"', type: 'MONITOR', status: 'IN_STOCK', owner: null },
  { tag: 'PAT-0021', name: 'HP LaserJet Pro M404', type: 'PRINTER', status: 'MAINTENANCE', owner: null },
  { tag: 'PAT-0033', name: 'Ubiquiti UniFi U6 Pro', type: 'NETWORK', status: 'IN_USE', owner: 'Infraestrutura' },
  { tag: 'PAT-0040', name: 'Servidor de arquivos NAS', type: 'SERVER', status: 'IN_USE', owner: 'Infraestrutura' },
  { tag: 'PAT-0052', name: 'iPhone 13', type: 'PHONE', status: 'IN_USE', owner: 'Marina Costa' },
  { tag: 'PAT-0007', name: 'Dell OptiPlex 3080', type: 'DESKTOP', status: 'RETIRED', owner: null },
];

export const DEMO_VOLUME: { day: string; abertos: number; resolvidos: number }[] = Array.from({ length: 30 }, (_, i) => {
  const wave = Math.sin(i / 3.2);
  return {
    day: `${String(i + 1).padStart(2, '0')}`,
    abertos: Math.round(14 + wave * 6 + (i % 5)),
    resolvidos: Math.round(12 + Math.cos(i / 3.6) * 5 + (i % 4)),
  };
});

export const DEMO_BY_PRIORITY = [
  { name: 'Crítica', total: 4, color: '#ff5d6c' },
  { name: 'Alta', total: 11, color: '#f5b82e' },
  { name: 'Média', total: 23, color: '#5b9dff' },
  { name: 'Baixa', total: 17, color: '#6e6e79' },
];

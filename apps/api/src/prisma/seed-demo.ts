import { DEFAULT_SLA, type Priority, type TicketStatus } from '../modules/tickets/ticket.rules';

// Gerador PURO dos chamados de demonstração: recebe "agora" e uma semente e devolve dados
// coerentes (datas em ordem, status compatível com os campos, SLA de acordo com a RN-04).
// Fica separado do seed para poder ser testado sem banco.

export interface DemoEvent {
  actorKey: string;
  action: string;
  fromValue: string | null;
  // Em ASSIGNEE_CHANGED o valor é a chave da pessoa; o seed troca pelo id.
  toValue: string | null;
  createdAt: Date;
}

export interface DemoComment {
  authorKey: string;
  body: string;
  internal: boolean;
  createdAt: Date;
}

export interface DemoTicket {
  title: string;
  description: string;
  categoryName: string;
  priority: Priority;
  status: TicketStatus;
  requesterKey: string;
  assigneeKey: string | null;
  assetTag: string | null;
  createdAt: Date;
  responseDueAt: Date;
  resolutionDueAt: Date;
  slaPausedAt: Date | null;
  firstRespondedAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  history: DemoEvent[];
  comments: DemoComment[];
}

export const DEMO_REQUESTERS = ['solicitante', 'ana', 'bruno', 'carla'] as const;
export const DEMO_AGENTS = ['atendente', 'diego', 'elisa'] as const;

interface Template {
  title: string;
  description: string;
  category: string;
  priority: Priority;
  asset?: string;
}

const TEMPLATES: Template[] = [
  { title: 'Notebook não liga após queda de energia', description: 'Depois da queda de energia de ontem o notebook não dá sinal de vida. O LED de carga pisca e a tela fica preta.', category: 'Hardware', priority: 'HIGH', asset: 'NB-0001' },
  { title: 'Monitor com linhas na tela', description: 'O monitor passou a exibir linhas verticais coloridas. Já troquei o cabo HDMI e o problema continua.', category: 'Hardware', priority: 'MEDIUM', asset: 'MN-0001' },
  { title: 'Teclado com teclas travando', description: 'As teclas E e R travam de vez em quando e preciso apertar mais de uma vez.', category: 'Hardware', priority: 'LOW' },
  { title: 'Impressora do 2º andar não imprime', description: 'Qualquer documento fica na fila e aparece o erro de atolamento de papel, mas a bandeja está vazia.', category: 'Impressão', priority: 'HIGH', asset: 'IM-0001' },
  { title: 'Toner da impressora acabando', description: 'A impressora indica toner baixo e as impressões estão saindo claras.', category: 'Impressão', priority: 'LOW', asset: 'IM-0001' },
  { title: 'Sem acesso à pasta compartilhada do financeiro', description: 'Desde segunda-feira recebo "acesso negado" ao abrir a pasta do financeiro, onde trabalhava normalmente.', category: 'Acesso e senha', priority: 'HIGH' },
  { title: 'Esqueci a senha do sistema de ponto', description: 'Errei a senha três vezes e a conta foi bloqueada. Preciso registrar o ponto ainda hoje.', category: 'Acesso e senha', priority: 'MEDIUM' },
  { title: 'Solicitar acesso ao CRM para novo colaborador', description: 'Nova pessoa da equipe comercial começa na segunda e precisa de acesso ao CRM com perfil de vendedor.', category: 'Acesso e senha', priority: 'LOW' },
  { title: 'Wi-Fi cai toda hora na sala de reuniões', description: 'Durante videochamadas a conexão cai a cada poucos minutos, só na sala de reuniões do 1º andar.', category: 'Rede', priority: 'HIGH' },
  { title: 'VPN não conecta no home office', description: 'Aparece "tempo esgotado" ao conectar na VPN. Funcionava até a semana passada.', category: 'Rede', priority: 'CRITICAL' },
  { title: 'Ponto de rede sem link na mesa 14', description: 'O cabo de rede da mesa 14 não detecta conexão, mesmo testando em outro computador.', category: 'Rede', priority: 'MEDIUM', asset: 'SW-0001' },
  { title: 'Instalar o pacote Office no notebook novo', description: 'Notebook recém-entregue sem o pacote Office instalado. Preciso para elaborar propostas.', category: 'Software', priority: 'MEDIUM', asset: 'NB-0002' },
  { title: 'Sistema de vendas lento', description: 'O sistema de vendas leva mais de um minuto para abrir cada pedido desde cedo.', category: 'Software', priority: 'CRITICAL' },
  { title: 'Erro ao abrir planilha com macros', description: 'Ao abrir a planilha de comissões o Excel mostra erro de macro e fecha.', category: 'Software', priority: 'MEDIUM' },
  { title: 'Atualização do antivírus pendente', description: 'O antivírus mostra aviso de atualização pendente há dias e não consigo concluir.', category: 'Software', priority: 'LOW' },
  { title: 'Caixa de entrada cheia', description: 'Recebo aviso de que a caixa de e-mail está em 98% e já apaguei o que pude.', category: 'E-mail', priority: 'LOW' },
  { title: 'E-mails indo para spam', description: 'Mensagens de um cliente importante estão caindo na pasta de spam desde ontem.', category: 'E-mail', priority: 'MEDIUM' },
  { title: 'Criar lista de distribuição do time comercial', description: 'Precisamos de uma lista única para falar com todo o time comercial.', category: 'E-mail', priority: 'LOW' },
  { title: 'Solicitação de segundo monitor', description: 'Pelo volume de planilhas e sistemas abertos, solicito um segundo monitor para a minha estação.', category: 'Outros', priority: 'LOW' },
  { title: 'Cadeira de TI para sala de suporte', description: 'Preciso de apoio para montar a estação de atendimento da sala de suporte.', category: 'Outros', priority: 'LOW' },
];

const STAFF_REPLIES = [
  'Olá! Já estou analisando o seu chamado e retorno em breve com uma posição.',
  'Recebi o chamado e estou verificando. Pode me confirmar se o problema acontece também em outro horário?',
  'Fiz um primeiro teste remoto e identifiquei a causa provável. Vou aplicar a correção.',
];
const INTERNAL_NOTES = [
  'Mesmo sintoma em outros dois chamados desta semana; possível causa comum.',
  'Peça solicitada ao fornecedor, previsão de dois dias úteis.',
  'Conferido o log do servidor: sem erros no horário relatado.',
];
const REQUESTER_REPLIES = [
  'Acontece o tempo todo, principalmente pela manhã.',
  'Obrigado! Fico no aguardo.',
  'Testei de novo agora e o problema continua igual.',
];
const SOLUTIONS = [
  'Problema corrigido e testado junto com o solicitante. Chamado resolvido.',
  'Substituição realizada e funcionamento normalizado.',
  'Configuração ajustada; acompanhamos por algumas horas e não houve reincidência.',
];

// PRNG determinístico (mulberry32): a mesma semente gera sempre os mesmos dados.
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const AUTO_CLOSE_AFTER = 3 * DAY; // RN-07

function pick<T>(random: () => number, list: readonly T[]): T {
  return list[Math.floor(random() * list.length)];
}

function weighted<T>(random: () => number, table: Array<[T, number]>): T {
  const total = table.reduce((sum, [, w]) => sum + w, 0);
  let r = random() * total;
  for (const [value, weight] of table) {
    r -= weight;
    if (r <= 0) return value;
  }
  return table[table.length - 1][0];
}

// Chamados antigos tendem a estar encerrados; os recentes, em andamento.
function statusFor(random: () => number, ageMs: number): TicketStatus {
  if (ageMs < 4 * HOUR) return weighted(random, [['OPEN', 6], ['IN_PROGRESS', 4]]);
  if (ageMs < 2 * DAY) return weighted(random, [['OPEN', 3], ['IN_PROGRESS', 4], ['WAITING_USER', 2], ['RESOLVED', 2]]);
  if (ageMs < 6 * DAY) return weighted(random, [['OPEN', 1], ['IN_PROGRESS', 4], ['WAITING_USER', 2], ['RESOLVED', 3], ['CLOSED', 4], ['CANCELLED', 1]]);
  return weighted(random, [['CLOSED', 10], ['CANCELLED', 1], ['IN_PROGRESS', 2], ['WAITING_USER', 1]]);
}

export function buildDemoTickets(now: Date, seed = 7, count = 48): DemoTicket[] {
  const random = rng(seed);
  // Nenhum evento fica no futuro, mesmo os que são "alguns minutos depois" de outro.
  const at = (ms: number) => new Date(Math.min(ms, now.getTime() - MIN));
  const tickets: DemoTicket[] = [];

  for (let i = 0; i < count; i++) {
    const template = TEMPLATES[i % TEMPLATES.length];
    // Distribuição enviesada para o presente: mais chamados nos últimos dias que no começo do mês.
    const ageMs = Math.max(45 * MIN, Math.pow(random(), 1.35) * 30 * DAY);
    const createdMs = now.getTime() - ageMs;
    const priority = random() < 0.2 ? pick(random, ['LOW', 'MEDIUM', 'HIGH'] as const) : template.priority;
    const policy = DEFAULT_SLA[priority];
    const requesterKey = pick(random, DEMO_REQUESTERS);
    const agentKey = pick(random, DEMO_AGENTS);
    let status = statusFor(random, ageMs);

    const history: DemoEvent[] = [
      { actorKey: requesterKey, action: 'CREATED', fromValue: null, toValue: 'OPEN', createdAt: at(createdMs) },
    ];
    const comments: DemoComment[] = [];
    let assigneeKey: string | null = null;
    let firstRespondedMs: number | null = null;
    let slaPausedMs: number | null = null;
    let resolvedMs: number | null = null;
    let closedMs: number | null = null;

    if (status === 'CANCELLED') {
      const when = createdMs + Math.min(ageMs - MIN, (30 + random() * 240) * MIN);
      history.push({ actorKey: requesterKey, action: 'STATUS_CHANGED', fromValue: 'OPEN', toValue: 'CANCELLED', createdAt: at(when) });
    } else if (status !== 'OPEN') {
      // Primeira resposta: a maioria dentro do prazo, uma minoria estourada.
      const delay = policy.firstResponseMinutes * MIN * (random() < 0.88 ? 0.05 + random() * 0.85 : 1.15 + random());
      firstRespondedMs = Math.min(createdMs + Math.max(3 * MIN, delay), now.getTime() - 2 * MIN);
      assigneeKey = agentKey;
      history.push(
        { actorKey: agentKey, action: 'ASSIGNEE_CHANGED', fromValue: null, toValue: agentKey, createdAt: at(firstRespondedMs) },
        { actorKey: agentKey, action: 'STATUS_CHANGED', fromValue: 'OPEN', toValue: 'IN_PROGRESS', createdAt: at(firstRespondedMs) },
      );
      comments.push({ authorKey: agentKey, body: pick(random, STAFF_REPLIES), internal: false, createdAt: at(firstRespondedMs + 2 * MIN) });
      if (random() < 0.5) {
        comments.push({ authorKey: agentKey, body: pick(random, INTERNAL_NOTES), internal: true, createdAt: at(firstRespondedMs + 9 * MIN) });
      }

      if (status === 'WAITING_USER') {
        slaPausedMs = Math.min(firstRespondedMs + (20 + random() * 120) * MIN, now.getTime() - 2 * MIN);
        history.push({ actorKey: agentKey, action: 'STATUS_CHANGED', fromValue: 'IN_PROGRESS', toValue: 'WAITING_USER', createdAt: at(slaPausedMs) });
      } else if (status === 'RESOLVED' || status === 'CLOSED') {
        const resolveDelay = policy.resolutionMinutes * MIN * (random() < 0.9 ? 0.15 + random() * 0.75 : 1.1 + random() * 0.8);
        const candidate = Math.max(createdMs + resolveDelay, firstRespondedMs + 15 * MIN);
        if (candidate > now.getTime() - 5 * MIN) {
          status = 'IN_PROGRESS'; // ainda não daria tempo de resolver
        } else {
          resolvedMs = candidate;
          comments.push({ authorKey: agentKey, body: pick(random, SOLUTIONS), internal: false, createdAt: at(resolvedMs - MIN) });
          history.push({ actorKey: agentKey, action: 'STATUS_CHANGED', fromValue: 'IN_PROGRESS', toValue: 'RESOLVED', createdAt: at(resolvedMs) });
          if (random() < 0.4) {
            comments.push({ authorKey: requesterKey, body: pick(random, REQUESTER_REPLIES.slice(1, 2)), internal: false, createdAt: at(resolvedMs + 20 * MIN) });
          }
          if (status === 'CLOSED') {
            closedMs = resolvedMs + (4 + random() * 44) * HOUR;
            if (closedMs > now.getTime() - MIN) {
              status = 'RESOLVED';
              closedMs = null;
            } else {
              history.push({ actorKey: agentKey, action: 'STATUS_CHANGED', fromValue: 'RESOLVED', toValue: 'CLOSED', createdAt: at(closedMs) });
            }
          }
          // RN-07: resolvido há mais de 3 dias já teria sido fechado pelo job automático.
          if (status === 'RESOLVED' && now.getTime() - resolvedMs >= AUTO_CLOSE_AFTER) {
            closedMs = resolvedMs + AUTO_CLOSE_AFTER;
            status = 'CLOSED';
            history.push({ actorKey: 'sistema', action: 'STATUS_CHANGED', fromValue: 'RESOLVED', toValue: 'CLOSED', createdAt: at(closedMs) });
          }
        }
      }
      if (status === 'IN_PROGRESS' && random() < 0.5) {
        comments.push({ authorKey: requesterKey, body: pick(random, REQUESTER_REPLIES), internal: false, createdAt: at(Math.min(firstRespondedMs + 40 * MIN, now.getTime() - MIN)) });
      }
    }

    history.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    comments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    tickets.push({
      title: template.title,
      description: template.description,
      categoryName: template.category,
      priority,
      status,
      requesterKey,
      assigneeKey,
      assetTag: template.asset ?? null,
      createdAt: at(createdMs),
      // Prazos podem estar no futuro; só os eventos já ocorridos são limitados a "agora".
      responseDueAt: new Date(createdMs + policy.firstResponseMinutes * MIN),
      resolutionDueAt: new Date(createdMs + policy.resolutionMinutes * MIN),
      slaPausedAt: slaPausedMs === null ? null : at(slaPausedMs),
      firstRespondedAt: firstRespondedMs === null ? null : at(firstRespondedMs),
      resolvedAt: resolvedMs === null ? null : at(resolvedMs),
      closedAt: closedMs === null ? null : at(closedMs),
      history,
      comments,
    });
  }
  return tickets.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

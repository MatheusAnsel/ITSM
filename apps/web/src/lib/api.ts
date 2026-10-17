import { getAccessToken, hasSessionHint, notifySessionExpired, setAccessToken, setSessionHint } from './session';
import type {
  Agent,
  AgentStat,
  Asset,
  AssetDetail,
  Attachment,
  AuditEntry,
  Category,
  CategoryStat,
  DashboardSummary,
  Page,
  Priority,
  SessionUser,
  SlaPolicy,
  Ticket,
  TicketComment,
  TicketHistory,
  TicketStatus,
  UserRecord,
  VolumeStat,
  Role,
  AssetStatus,
  AssetType,
} from './types';

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string,
    // Erros de validação por campo (400), como { email: ['...'] }; as mensagens vêm em inglês do validador.
    readonly fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

interface ErrorBody {
  errors?: Record<string, string[]>;
  message?: string | string[];
  requestId?: string;
}

const messageOf = (body: ErrorBody, fallback: string): string =>
  Array.isArray(body.message) ? body.message.join('; ') : (body.message ?? fallback);

async function send(path: string, init: RequestInit, token: string | null): Promise<Response> {
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  try {
    return await fetch(`${API_URL}${path}`, { ...init, headers, credentials: 'include' });
  } catch {
    throw new ApiError('Não foi possível conectar à API', 0);
  }
}

// Uma única renovação por vez: várias requisições que recebem 401 juntas esperam a mesma resposta.
let refreshing: Promise<SessionUser | null> | null = null;

export function refreshSession(): Promise<SessionUser | null> {
  // Sem dica de login não há o que renovar. Esse atalho fica fora da promessa compartilhada: se ficasse
  // dentro, o `null` ficaria guardado e uma renovação depois de um login novo devolveria sempre `null`.
  if (!hasSessionHint()) return Promise.resolve(null);
  refreshing ??= (async () => {
    try {
      const res = await send('/auth/refresh', { method: 'POST' }, null);
      if (!res.ok) {
        setAccessToken(null);
        setSessionHint(false);
        return null;
      }
      const body = (await res.json()) as { accessToken: string; user: SessionUser };
      setAccessToken(body.accessToken);
      return body.user;
    } catch {
      return null;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

async function raw(path: string, init: RequestInit = {}): Promise<Response> {
  let res = await send(path, init, getAccessToken());
  if (res.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshSession()) {
      res = await send(path, init, getAccessToken());
    } else {
      notifySessionExpired();
    }
  }
  return res;
}

// Mensagens para quem não deve ler "Erro 504" ou "ThrottlerException": limite de tentativas e servidor
// gratuito acordando (o proxy da Vercel devolve 502/503/504 sem corpo JSON enquanto a API sobe).
const RATE_LIMITED = 'Muitas tentativas em pouco tempo. Aguarde um minuto e tente de novo.';
const WAKING_UP = 'O servidor está acordando ou indisponível. Aguarde cerca de um minuto e tente de novo.';

function failureMessage(status: number, body: ErrorBody): string {
  if (status === 429) return RATE_LIMITED;
  if (!body.message && (status === 502 || status === 503 || status === 504)) return WAKING_UP;
  return messageOf(body, `Erro ${status}`);
}

async function fail(res: Response): Promise<never> {
  const body = (await res.json().catch(() => ({}))) as ErrorBody;
  throw new ApiError(failureMessage(res.status, body), res.status, body.requestId, body.errors);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await raw(path, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) return fail(res);
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ---- Autenticação ----
interface AuthResult {
  accessToken: string;
  user: SessionUser;
}

async function authenticate(path: string, payload: unknown): Promise<SessionUser> {
  const res = await send(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }, null);
  if (!res.ok) return fail(res);
  const body = (await res.json()) as AuthResult;
  setAccessToken(body.accessToken);
  setSessionHint(true);
  return body.user;
}

export const login = (email: string, password: string) => authenticate('/auth/login', { email, password });
export const register = (name: string, email: string, password: string) =>
  authenticate('/auth/register', { name, email, password });

export async function logout(): Promise<void> {
  try {
    await request<void>('POST', '/auth/logout');
  } finally {
    setAccessToken(null);
    setSessionHint(false);
  }
}

export const changePassword = (currentPassword: string, newPassword: string) =>
  request<void>('PATCH', '/auth/me/password', { currentPassword, newPassword });

// ---- Chamados ----
export interface TicketQuery {
  q?: string;
  status?: TicketStatus | '';
  priority?: Priority | '';
  categoryId?: string;
  assigneeId?: string;
  slaBreached?: boolean;
  sort?: string;
  page?: number;
  perPage?: number;
}

export const listTickets = (query: TicketQuery) => request<Page<Ticket>>('GET', `/tickets${qs({ ...query })}`);
export const getTicket = (id: string) => request<Ticket>('GET', `/tickets/${id}`);
export const createTicket = (input: { title: string; description: string; categoryId: string; priority?: Priority; assetId?: string }) =>
  request<Ticket>('POST', '/tickets', input);
export const updateTicket = (id: string, change: { title?: string; categoryId?: string; priority?: Priority; assetId?: string | null }) =>
  request<Ticket>('PATCH', `/tickets/${id}`, change);
export const assignTicket = (id: string, assigneeId: string) => request<Ticket>('POST', `/tickets/${id}/assign`, { assigneeId });
export const changeTicketStatus = (id: string, status: TicketStatus) => request<Ticket>('POST', `/tickets/${id}/status`, { status });
export const listComments = (id: string) => request<TicketComment[]>('GET', `/tickets/${id}/comments`);
export const addComment = (id: string, body: string, internal: boolean) =>
  request<Ticket>('POST', `/tickets/${id}/comments`, { body, internal });
export const listHistory = (id: string) => request<TicketHistory[]>('GET', `/tickets/${id}/history`);

// ---- Anexos ----
export const listAttachments = (ticketId: string) => request<Attachment[]>('GET', `/tickets/${ticketId}/attachments`);

export async function uploadAttachment(ticketId: string, file: File): Promise<Attachment> {
  const form = new FormData();
  form.set('file', file);
  const res = await raw(`/tickets/${ticketId}/attachments`, { method: 'POST', body: form });
  if (!res.ok) return fail(res);
  return (await res.json()) as Attachment;
}

// O download exige o token no cabeçalho, então não dá para usar um link direto: baixa como blob.
export async function downloadAttachment(ticketId: string, attachment: Attachment): Promise<void> {
  const res = await raw(`/tickets/${ticketId}/attachments/${attachment.id}`);
  if (!res.ok) return fail(res);
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = attachment.filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// ---- Categorias, usuários, SLA ----
export const listCategories = () => request<Category[]>('GET', '/categories');
export const createCategory = (input: { name: string; description?: string }) => request<Category>('POST', '/categories', input);
export const updateCategory = (id: string, change: { name?: string; description?: string; active?: boolean }) =>
  request<Category>('PATCH', `/categories/${id}`, change);

export const listAgents = () => request<Agent[]>('GET', '/users/agents');
// Diretório de usuários ativos (gestor/admin) para escolher responsável por um ativo.
export const listDirectory = () => request<Agent[]>('GET', '/users/directory');
export const listUsers = (query: { search?: string; role?: Role | ''; page?: number; pageSize?: number }) =>
  request<Page<UserRecord>>('GET', `/users${qs(query)}`);
export const createUser = (input: { name: string; email: string; password: string; role: Role }) =>
  request<UserRecord>('POST', '/users', input);
export const updateUser = (id: string, change: { name?: string; role?: Role; active?: boolean }) =>
  request<UserRecord>('PATCH', `/users/${id}`, change);

export const listSlaPolicies = () => request<SlaPolicy[]>('GET', '/sla-policies');
export const updateSlaPolicy = (priority: Priority, input: { firstResponseMinutes: number; resolutionMinutes: number }) =>
  request<SlaPolicy>('PUT', `/sla-policies/${priority}`, input);

// ---- Ativos ----
export interface AssetInput {
  tag: string;
  name: string;
  type: AssetType;
  status?: AssetStatus;
  serialNumber?: string | null;
  purchaseDate?: string | null;
  notes?: string | null;
  assignedToId?: string | null;
}

export const listAssets = (query: { q?: string; type?: AssetType | ''; status?: AssetStatus | ''; page?: number; pageSize?: number }) =>
  request<Page<Asset>>('GET', `/assets${qs(query)}`);
export const getAsset = (id: string) => request<AssetDetail>('GET', `/assets/${id}`);
export const createAsset = (input: AssetInput) => request<Asset>('POST', '/assets', input);
export const updateAsset = (id: string, change: Partial<AssetInput>) => request<Asset>('PATCH', `/assets/${id}`, change);

// ---- Painel e auditoria ----
export const dashboardSummary = () => request<DashboardSummary>('GET', '/dashboard/summary');
export const dashboardByCategory = () => request<CategoryStat[]>('GET', '/dashboard/by-category');
export const dashboardByAgent = () => request<AgentStat[]>('GET', '/dashboard/by-agent');
export const dashboardVolume = () => request<VolumeStat[]>('GET', '/dashboard/volume');

export const listAudit = (query: { action?: string; entity?: string; page?: number; pageSize?: number }) =>
  request<Page<AuditEntry>>('GET', `/audit${qs(query)}`);

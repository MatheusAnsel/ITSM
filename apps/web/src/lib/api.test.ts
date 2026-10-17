import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, listTickets, login, logout, refreshSession } from './api';
import { getAccessToken, hasSessionHint, onSessionExpired, setAccessToken, setSessionHint } from './session';

const user = { id: 'u1', name: 'Ana Souza', email: 'ana@itsm.local', role: 'AGENT' as const };

const json = (status: number, body: unknown = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  setAccessToken(null);
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe('login', () => {
  it('guarda o token em memória e marca a dica de sessão', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: 'tok-1', user }));
    await expect(login('ana@itsm.local', 'segredo')).resolves.toEqual(user);
    expect(getAccessToken()).toBe('tok-1');
    expect(hasSessionHint()).toBe(true);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.credentials).toBe('include');
  });

  it('junta mensagens de validação da API em um único texto', async () => {
    fetchMock.mockResolvedValueOnce(json(400, { message: ['e-mail inválido', 'senha curta'], requestId: 'req-9' }));
    const err = await login('x', 'y').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, message: 'e-mail inválido; senha curta', requestId: 'req-9' });
    expect(getAccessToken()).toBeNull();
  });

  it('traduz falha de rede em ApiError com status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(login('a', 'b')).rejects.toMatchObject({ status: 0, message: 'Não foi possível conectar à API' });
  });
});

describe('mensagens de erro compreensíveis', () => {
  const text = (status: number, body = '') => new Response(body, { status });

  it('troca "Erro 504" sem corpo por um aviso de servidor acordando', async () => {
    fetchMock.mockResolvedValueOnce(text(504, '<html>Gateway Timeout</html>'));
    await expect(login('a@b.co', 'senha-123456')).rejects.toMatchObject({
      status: 504,
      message: expect.stringContaining('acordando'),
    });
  });

  it('traduz o limite de tentativas (429), mesmo quando a API manda texto em inglês', async () => {
    fetchMock.mockResolvedValueOnce(json(429, { message: 'ThrottlerException: Too Many Requests' }));
    await expect(login('a@b.co', 'senha-123456')).rejects.toMatchObject({
      status: 429,
      message: expect.stringContaining('Muitas tentativas'),
    });
  });

  it('mantém a mensagem da API quando ela existe, e expõe os campos recusados', async () => {
    fetchMock.mockResolvedValueOnce(json(400, { message: 'Dados inválidos', errors: { email: ['email must be an email'] }, requestId: 'req-7' }));
    const err = await login('x', 'y').catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 400, message: 'Dados inválidos', requestId: 'req-7', fields: { email: ['email must be an email'] } });
  });

  it('usa "Erro N" só quando não há nada melhor a dizer', async () => {
    fetchMock.mockResolvedValueOnce(text(418));
    await expect(login('a@b.co', 'senha-123456')).rejects.toMatchObject({ message: 'Erro 418' });
  });
});

describe('refreshSession', () => {
  it('não chama a API quando nunca houve login neste navegador', async () => {
    await expect(refreshSession()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('renova normalmente depois de um carregamento sem login e de um login novo (regressão)', async () => {
    // Visitante sem sessão abre o site: a tentativa inicial de restaurar a sessão não faz nada.
    await expect(refreshSession()).resolves.toBeNull();
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: 'tok-login', user }));
    await login('ana@itsm.local', 'segredo');
    // Quando o token expirar, a renovação precisa chamar a API de verdade, e não devolver o null antigo.
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: 'tok-renovado', user }));
    await expect(refreshSession()).resolves.toEqual(user);
    expect(getAccessToken()).toBe('tok-renovado');
  });

  it('renova a sessão e guarda o novo token', async () => {
    setSessionHint(true);
    fetchMock.mockResolvedValueOnce(json(200, { accessToken: 'tok-2', user }));
    await expect(refreshSession()).resolves.toEqual(user);
    expect(getAccessToken()).toBe('tok-2');
  });

  it('limpa o token e a dica quando o refresh é recusado', async () => {
    setSessionHint(true);
    setAccessToken('velho');
    fetchMock.mockResolvedValueOnce(json(401, { message: 'Sessão inválida' }));
    await expect(refreshSession()).resolves.toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
  });

  it('compartilha uma única chamada entre renovações simultâneas', async () => {
    setSessionHint(true);
    fetchMock.mockResolvedValue(json(200, { accessToken: 'tok-3', user }));
    const [a, b, c] = await Promise.all([refreshSession(), refreshSession(), refreshSession()]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect([a, b, c]).toEqual([user, user, user]);
  });
});

describe('requisições autenticadas', () => {
  it('não tenta renovar em rotas /auth/* e limpa a sessão local no logout, mesmo com erro', async () => {
    setSessionHint(true);
    setAccessToken('expirado');
    fetchMock.mockResolvedValueOnce(json(401, { message: 'Token expirado' }));
    await logout().catch(() => undefined);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getAccessToken()).toBeNull();
    expect(hasSessionHint()).toBe(false);
  });

  it('avisa a interface quando o refresh falha de vez em uma rota de dados', async () => {
    setSessionHint(true);
    setAccessToken('expirado');
    const expired = vi.fn();
    const off = onSessionExpired(expired);
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'Token expirado' }))
      .mockResolvedValueOnce(json(401, { message: 'Sessão inválida' }));
    await expect(listTickets({})).rejects.toMatchObject({ status: 401 });
    expect(expired).toHaveBeenCalledTimes(1);
    off();
  });

  it('refaz a chamada com o token novo depois de renovar', async () => {
    setSessionHint(true);
    setAccessToken('expirado');
    fetchMock
      .mockResolvedValueOnce(json(401, { message: 'Token expirado' }))
      .mockResolvedValueOnce(json(200, { accessToken: 'novo', user }))
      .mockResolvedValueOnce(json(200, { items: [], total: 0, page: 1 }));
    await expect(listTickets({})).resolves.toMatchObject({ total: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const retryHeaders = fetchMock.mock.calls[2][1].headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer novo');
  });
});

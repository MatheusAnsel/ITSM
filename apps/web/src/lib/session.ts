// O access token fica só em memória (nunca em localStorage): um XSS não consegue lê-lo do
// armazenamento. O refresh token vai em cookie httpOnly definido pela API.
let accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};
export const getAccessToken = (): string | null => accessToken;

// Avisa a interface quando a sessão acaba de vez (refresh recusado).
type Listener = () => void;
const expiredListeners = new Set<Listener>();
export const onSessionExpired = (listener: Listener): (() => void) => {
  expiredListeners.add(listener);
  return () => expiredListeners.delete(listener);
};
export const notifySessionExpired = (): void => expiredListeners.forEach((l) => l());

// Dica não sensível de que já houve login neste navegador. Sem ela, quem nunca entrou não gera uma
// chamada de renovação destinada a falhar (um 401 no console a cada visita). Não é credencial.
const HINT_KEY = 'itsm:session';
export const hasSessionHint = (): boolean => {
  try {
    return localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return true; // sem acesso ao storage, tenta renovar de qualquer jeito
  }
};
export const setSessionHint = (on: boolean): void => {
  try {
    if (on) localStorage.setItem(HINT_KEY, '1');
    else localStorage.removeItem(HINT_KEY);
  } catch {
    /* storage indisponível: a dica é só uma otimização */
  }
};

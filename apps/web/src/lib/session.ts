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

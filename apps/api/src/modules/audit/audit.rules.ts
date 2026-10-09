// Nomes de campo que nunca entram no log, mesmo como nome (RN-10 registra o que mudou, não os valores).
const SENSITIVE = /pass|token|secret|hash/i;

// Lista os campos enviados no corpo da requisição, sem valores e sem campos sensíveis.
export function changedFields(body: unknown): string[] {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return [];
  return Object.keys(body as Record<string, unknown>).filter((k) => !SENSITIVE.test(k));
}

// Extrai o IP do cliente de forma defensiva e limita o tamanho gravado.
export function clientIp(ip: unknown): string | null {
  return typeof ip === 'string' && ip.length > 0 ? ip.slice(0, 64) : null;
}

// Copia apenas as chaves informadas e não sensíveis do corpo (valores de campos como status, perfil e prazos).
export function pickFields(body: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const source = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of keys) {
    if (SENSITIVE.test(key)) continue;
    const value = source[key];
    if (['string', 'number', 'boolean'].includes(typeof value) || value === null) out[key] = value;
  }
  return out;
}

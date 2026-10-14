// Só aceita destino interno ("/tickets"), nunca URL externa ou "//host" (open redirect).
export function safeNext(value: string | null | undefined, fallback = '/'): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback;
  return value;
}

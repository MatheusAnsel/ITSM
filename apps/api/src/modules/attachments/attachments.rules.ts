// Regras puras de anexos (RN-12): limites, tipos aceitos e verificação do conteúdo real.
export const MAX_ATTACHMENTS_PER_TICKET = 10;
export const DEFAULT_MAX_UPLOAD_MB = 5;

export type AttachmentKind = 'png' | 'jpeg' | 'pdf' | 'txt' | 'log';

export interface DetectedType {
  kind: AttachmentKind;
  mimeType: string;
}

const MIME: Record<AttachmentKind, string> = {
  png: 'image/png',
  jpeg: 'image/jpeg',
  pdf: 'application/pdf',
  txt: 'text/plain',
  log: 'text/plain',
};

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-

const startsWith = (buf: Uint8Array, magic: number[]): boolean =>
  buf.length >= magic.length && magic.every((byte, i) => buf[i] === byte);

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot < 0 ? '' : filename.slice(dot + 1).toLowerCase();
}

// Texto puro: UTF-8 válido, sem byte nulo. Evita aceitar binário renomeado para .txt.
export function isPlainText(buf: Uint8Array): boolean {
  if (buf.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(buf);
    return true;
  } catch {
    return false;
  }
}

/**
 * Descobre o tipo olhando o conteúdo, não o que o cliente declarou. Retorna `null` se o tipo
 * não é aceito ou se a extensão não bate com o conteúdo (ex.: executável chamado de .png).
 */
export function detectType(buf: Uint8Array, filename: string): DetectedType | null {
  const ext = extensionOf(filename);
  let kind: AttachmentKind | null = null;

  if (startsWith(buf, PNG)) kind = ext === 'png' ? 'png' : null;
  else if (startsWith(buf, JPEG)) kind = ext === 'jpg' || ext === 'jpeg' ? 'jpeg' : null;
  else if (startsWith(buf, PDF)) kind = ext === 'pdf' ? 'pdf' : null;
  else if ((ext === 'txt' || ext === 'log') && isPlainText(buf)) kind = ext;

  return kind ? { kind, mimeType: MIME[kind] } : null;
}

// O nome original só é usado para exibição: sem caminho, sem caracteres de controle e com tamanho limitado.
export function sanitizeDisplayName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const clean = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, '').trim();
  if (!clean || clean === '.' || clean === '..') return 'arquivo';
  if (clean.length <= 150) return clean;
  const ext = extensionOf(clean);
  return `${clean.slice(0, 140)}${ext ? `.${ext}` : ''}`;
}

// O multer entrega o nome como latin1; browsers enviam UTF-8. Reverte quando o resultado é válido.
export function fixFilenameEncoding(name: string): string {
  const decoded = Buffer.from(name, 'latin1').toString('utf8');
  return decoded.includes('�') ? name : decoded;
}

export function uploadLimitBytes(megabytes: number): number {
  return Math.floor(megabytes * 1024 * 1024);
}

export const ALLOWED_TYPES_LABEL = 'PNG, JPEG, PDF, TXT ou LOG';

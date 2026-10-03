import { createHash, randomBytes } from 'node:crypto';

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 72; // limite do bcrypt (bytes)
export const BCRYPT_COST = 12;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Política mínima da seção 13: 10+ caracteres. O teto de 72 bytes evita
// truncamento silencioso do bcrypt.
export function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_LENGTH) {
    errors.push(`A senha pode ter no máximo ${MAX_PASSWORD_LENGTH} bytes`);
  }
  return errors;
}

// O refresh token é um valor aleatório opaco; só o hash vai para o banco.
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface StoredRefreshToken {
  expiresAt: Date;
  revokedAt: Date | null;
}

export type RefreshDecision = 'ACCEPT' | 'EXPIRED' | 'REUSE_DETECTED';

// Seção 8.3: token revogado sendo reapresentado indica roubo e derruba
// todas as sessões do usuário.
export function decideRefresh(stored: StoredRefreshToken, now: Date): RefreshDecision {
  if (stored.revokedAt) return 'REUSE_DETECTED';
  if (stored.expiresAt.getTime() <= now.getTime()) return 'EXPIRED';
  return 'ACCEPT';
}

export function refreshExpiry(now: Date, ttlDays: number): Date {
  return new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

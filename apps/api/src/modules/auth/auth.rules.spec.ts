import {
  decideRefresh,
  generateRefreshToken,
  hashToken,
  normalizeEmail,
  refreshExpiry,
  validatePassword,
} from './auth.rules';
import { canBeAssignee, hasAnyRole, isStaff } from '../../common/roles';

describe('normalizeEmail', () => {
  it('remove espaços e põe em minúsculas', () => {
    expect(normalizeEmail('  Ana@Empresa.COM ')).toBe('ana@empresa.com');
  });
});

describe('validatePassword', () => {
  it('aceita senha com 10 caracteres', () => {
    expect(validatePassword('abcdefghij')).toEqual([]);
  });
  it('rejeita senha curta', () => {
    expect(validatePassword('curta')).toHaveLength(1);
  });
  it('rejeita senha acima de 72 bytes', () => {
    expect(validatePassword('a'.repeat(73))).toHaveLength(1);
    expect(validatePassword('é'.repeat(37))).toHaveLength(1); // 74 bytes
  });
});

describe('refresh token', () => {
  it('gera tokens distintos e o hash não contém o token', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).toBe(hashToken(a.token));
    expect(a.hash).not.toContain(a.token);
  });

  const now = new Date('2026-10-03T12:00:00Z');
  it('aceita token válido', () => {
    expect(decideRefresh({ expiresAt: new Date('2026-10-04T00:00:00Z'), revokedAt: null }, now)).toBe(
      'ACCEPT',
    );
  });
  it('rejeita token expirado', () => {
    expect(decideRefresh({ expiresAt: new Date('2026-10-03T12:00:00Z'), revokedAt: null }, now)).toBe(
      'EXPIRED',
    );
  });
  it('detecta reuso de token revogado, mesmo que ainda não expirado', () => {
    expect(
      decideRefresh({ expiresAt: new Date('2026-10-10T00:00:00Z'), revokedAt: new Date() }, now),
    ).toBe('REUSE_DETECTED');
  });
  it('calcula a expiração em dias', () => {
    expect(refreshExpiry(now, 7).toISOString()).toBe('2026-10-10T12:00:00.000Z');
  });
});

describe('perfis', () => {
  it('identifica equipe de atendimento', () => {
    expect(isStaff('REQUESTER')).toBe(false);
    expect(isStaff('AGENT')).toBe(true);
  });
  it('confere perfis permitidos', () => {
    expect(hasAnyRole('MANAGER', ['MANAGER', 'ADMIN'])).toBe(true);
    expect(hasAnyRole('AGENT', ['MANAGER', 'ADMIN'])).toBe(false);
  });
  it('só usuário ativo da equipe pode ser atendente (RN-03)', () => {
    expect(canBeAssignee({ role: 'AGENT', active: true })).toBe(true);
    expect(canBeAssignee({ role: 'AGENT', active: false })).toBe(false);
    expect(canBeAssignee({ role: 'REQUESTER', active: true })).toBe(false);
  });
});

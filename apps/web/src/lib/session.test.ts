import { afterEach, describe, expect, it, vi } from 'vitest';
import { getAccessToken, hasSessionHint, notifySessionExpired, onSessionExpired, setAccessToken, setSessionHint } from './session';

afterEach(() => {
  setAccessToken(null);
  localStorage.clear();
});

describe('token de acesso', () => {
  it('fica só em memória, nunca no storage', () => {
    setAccessToken('abc');
    expect(getAccessToken()).toBe('abc');
    expect(JSON.stringify({ ...localStorage })).not.toContain('abc');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });
});

describe('dica de sessão', () => {
  it('liga e desliga', () => {
    expect(hasSessionHint()).toBe(false);
    setSessionHint(true);
    expect(hasSessionHint()).toBe(true);
    setSessionHint(false);
    expect(hasSessionHint()).toBe(false);
  });
  it('tenta renovar mesmo quando o storage está indisponível', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(hasSessionHint()).toBe(true);
  });
  it('não quebra ao gravar quando o storage está indisponível', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado');
    });
    expect(() => setSessionHint(true)).not.toThrow();
  });
});

describe('sessão expirada', () => {
  it('avisa quem se inscreveu e para de avisar após cancelar', () => {
    const listener = vi.fn();
    const off = onSessionExpired(listener);
    notifySessionExpired();
    expect(listener).toHaveBeenCalledTimes(1);
    off();
    notifySessionExpired();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it } from 'vitest';
import { safeNext } from './navigation';

describe('safeNext (proteção contra open redirect)', () => {
  it('aceita caminhos internos', () => {
    expect(safeNext('/tickets')).toBe('/tickets');
    expect(safeNext('/tickets?status=OPEN')).toBe('/tickets?status=OPEN');
  });
  it('recusa URL externa, host sem esquema e barra invertida', () => {
    expect(safeNext('https://evil.example')).toBe('/');
    expect(safeNext('//evil.example')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext('javascript:alert(1)')).toBe('/');
  });
  it('usa o destino padrão quando não há valor', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext(undefined, '/dashboard')).toBe('/dashboard');
    expect(safeNext('')).toBe('/');
  });
});

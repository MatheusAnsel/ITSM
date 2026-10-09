import { changedFields, clientIp, pickFields } from './audit.rules';

describe('audit.rules', () => {
  describe('changedFields', () => {
    it('lista os campos enviados sem os valores', () => {
      expect(changedFields({ name: 'Ana', role: 'ADMIN' })).toEqual(['name', 'role']);
    });
    it('omite campos sensíveis', () => {
      expect(
        changedFields({
          email: 'a@b.com',
          password: 'x',
          newPassword: 'y',
          refreshToken: 'z',
          passwordHash: 'h',
        }),
      ).toEqual(['email']);
    });
    it('tolera corpo ausente, nulo ou em formato inesperado', () => {
      expect(changedFields(undefined)).toEqual([]);
      expect(changedFields(null)).toEqual([]);
      expect(changedFields(['a'])).toEqual([]);
      expect(changedFields('texto')).toEqual([]);
    });
  });

  describe('pickFields', () => {
    it('copia somente as chaves pedidas com valores simples', () => {
      expect(
        pickFields({ status: 'RESOLVED', note: 'x', nested: { a: 1 } }, ['status', 'nested']),
      ).toEqual({ status: 'RESOLVED' });
    });
    it('mantém null e booleanos, e ignora chaves sensíveis mesmo se pedidas', () => {
      expect(
        pickFields({ active: false, assignedToId: null, password: 'x' }, [
          'active',
          'assignedToId',
          'password',
        ]),
      ).toEqual({
        active: false,
        assignedToId: null,
      });
    });
    it('retorna vazio para corpo inválido', () => {
      expect(pickFields(undefined, ['a'])).toEqual({});
    });
  });

  describe('clientIp', () => {
    it('aceita texto e limita o tamanho', () => {
      expect(clientIp('10.0.0.1')).toBe('10.0.0.1');
      expect(clientIp('x'.repeat(200))).toHaveLength(64);
    });
    it('devolve null para valores ausentes ou vazios', () => {
      expect(clientIp(undefined)).toBeNull();
      expect(clientIp('')).toBeNull();
    });
  });
});

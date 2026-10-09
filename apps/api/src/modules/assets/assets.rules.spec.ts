import { normalizeTag, resolveAssignee, validateAssetState } from './assets.rules';

describe('assets.rules', () => {
  it('normaliza o patrimônio para caixa alta sem espaços nas pontas', () => {
    expect(normalizeTag('  nb-0001 ')).toBe('NB-0001');
  });

  describe('validateAssetState (RN-09)', () => {
    it('exige responsável para ativo em uso', () => {
      expect(validateAssetState('IN_USE', null)).toHaveLength(1);
      expect(validateAssetState('IN_USE', 'u1')).toEqual([]);
    });
    it('não permite responsável em ativo aposentado', () => {
      expect(validateAssetState('RETIRED', 'u1')).toHaveLength(1);
      expect(validateAssetState('RETIRED', null)).toEqual([]);
    });
    it('aceita estoque e manutenção com ou sem responsável', () => {
      expect(validateAssetState('IN_STOCK', null)).toEqual([]);
      expect(validateAssetState('MAINTENANCE', 'u1')).toEqual([]);
    });
  });

  describe('resolveAssignee', () => {
    it('remove o responsável ao aposentar sem informar outro', () => {
      expect(resolveAssignee('RETIRED', 'u1', undefined)).toBeNull();
    });
    it('mantém o atual quando nada foi informado', () => {
      expect(resolveAssignee('IN_USE', 'u1', undefined)).toBe('u1');
    });
    it('respeita o valor informado, inclusive null', () => {
      expect(resolveAssignee('IN_STOCK', 'u1', null)).toBeNull();
      expect(resolveAssignee('IN_USE', 'u1', 'u2')).toBe('u2');
    });
  });
});

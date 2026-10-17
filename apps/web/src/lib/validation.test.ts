import { describe, expect, it } from 'vitest';
import { serverFieldErrors, validateRegister } from './validation';

const ok = { name: 'Ana Souza', email: 'ana@empresa.com', password: 'senha-forte-123' };

describe('validateRegister', () => {
  it('aceita dados válidos', () => {
    expect(validateRegister(ok)).toEqual({});
  });

  it('diz o que falta quando tudo está vazio', () => {
    expect(validateRegister({ name: '', email: '', password: '' })).toEqual({
      name: 'Informe seu nome (ao menos 2 letras)',
      email: 'Informe seu e-mail',
      password: 'Crie uma senha',
    });
  });

  it('ignora espaços ao medir o nome', () => {
    expect(validateRegister({ ...ok, name: ' A ' }).name).toMatch(/nome/);
  });

  it('recusa e-mail sem domínio completo', () => {
    for (const email of ['ana', 'ana@', 'ana@empresa', 'ana empresa@x.com', '@empresa.com']) {
      expect(validateRegister({ ...ok, email }).email).toMatch(/e-mail válido/);
    }
    expect(validateRegister({ ...ok, email: '  ana@empresa.com ' }).email).toBeUndefined();
  });

  it('exige ao menos 10 caracteres na senha', () => {
    expect(validateRegister({ ...ok, password: '123456789' }).password).toBe('A senha precisa ter ao menos 10 caracteres');
    expect(validateRegister({ ...ok, password: '1234567890' }).password).toBeUndefined();
  });

  it('respeita o limite de 72 bytes do bcrypt, contando acentos', () => {
    expect(validateRegister({ ...ok, password: 'a'.repeat(72) }).password).toBeUndefined();
    expect(validateRegister({ ...ok, password: 'a'.repeat(73) }).password).toMatch(/longa demais/);
    // 40 letras com acento = 80 bytes, mesmo com só 40 caracteres.
    expect(validateRegister({ ...ok, password: 'ã'.repeat(40) }).password).toMatch(/longa demais/);
  });
});

describe('serverFieldErrors', () => {
  it('traduz os campos recusados pela API', () => {
    expect(serverFieldErrors({ email: ['email must be an email'], password: ['x'] })).toEqual({
      email: 'E-mail inválido',
      password: 'Senha inválida',
    });
  });
  it('devolve vazio sem detalhes por campo', () => {
    expect(serverFieldErrors(undefined)).toEqual({});
  });
});

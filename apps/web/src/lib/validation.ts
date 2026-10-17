// Validação do cadastro no navegador, em português, para o usuário saber o que corrigir antes de enviar.
// A API valida de novo (nada aqui substitui a validação do servidor).
export const MIN_PASSWORD = 10;
export const MAX_PASSWORD_BYTES = 72; // limite do bcrypt, o mesmo da API

export interface RegisterValues {
  name: string;
  email: string;
  password: string;
}

export type RegisterErrors = Partial<Record<keyof RegisterValues, string>>;

// Simples de propósito: algo@dominio.tld, sem espaços. O servidor faz a checagem definitiva.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateRegister({ name, email, password }: RegisterValues): RegisterErrors {
  const errors: RegisterErrors = {};
  if (name.trim().length < 2) errors.name = 'Informe seu nome (ao menos 2 letras)';
  if (!email.trim()) errors.email = 'Informe seu e-mail';
  else if (!EMAIL.test(email.trim())) errors.email = 'Informe um e-mail válido, como nome@empresa.com';
  if (!password) errors.password = 'Crie uma senha';
  else if (password.length < MIN_PASSWORD) errors.password = `A senha precisa ter ao menos ${MIN_PASSWORD} caracteres`;
  else if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    errors.password = `A senha é longa demais (máximo de ${MAX_PASSWORD_BYTES} bytes; acentos contam mais de um)`;
  }
  return errors;
}

// Traduz o erro de validação da API (400, por campo) quando o navegador deixou passar algo.
export function serverFieldErrors(fields: Record<string, string[]> | undefined): RegisterErrors {
  const errors: RegisterErrors = {};
  if (fields?.name) errors.name = 'Nome inválido';
  if (fields?.email) errors.email = 'E-mail inválido';
  if (fields?.password) errors.password = 'Senha inválida';
  return errors;
}

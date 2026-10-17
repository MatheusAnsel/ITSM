import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { RegisterForm } from './register-form';

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), replace: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('@/components/auth/auth-provider', () => ({ useAuth: () => ({ signUp: mocks.signUp }) }));

async function fill(values: { name?: string; email?: string; password?: string }) {
  if (values.name !== undefined) await userEvent.type(screen.getByLabelText(/^Nome/), values.name);
  if (values.email !== undefined) await userEvent.type(screen.getByLabelText(/^E-mail/), values.email);
  if (values.password !== undefined) await userEvent.type(screen.getByLabelText(/^Senha/), values.password);
}
const submit = () => userEvent.click(screen.getByRole('button', { name: 'Criar conta' }));

describe('RegisterForm', () => {
  beforeEach(() => {
    mocks.signUp.mockReset();
    mocks.replace.mockReset();
  });

  it('o botão nunca fica desabilitado em silêncio e explica o que falta ao enviar vazio', async () => {
    render(<RegisterForm />);
    const button = screen.getByRole('button', { name: 'Criar conta' });
    expect(button).toBeEnabled();
    await submit();
    expect(screen.getByText('Informe seu nome (ao menos 2 letras)')).toBeInTheDocument();
    expect(screen.getByText('Informe seu e-mail')).toBeInTheDocument();
    expect(screen.getByText('Crie uma senha')).toBeInTheDocument();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('aponta o e-mail inválido e leva o foco ao primeiro campo com problema', async () => {
    render(<RegisterForm />);
    await fill({ name: 'Ana Souza', email: 'ana@empresa', password: 'senha-forte-123' });
    await submit();
    expect(screen.getByText(/e-mail válido/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^E-mail/)).toHaveFocus();
    expect(screen.getByLabelText(/^E-mail/)).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('mostra quantos caracteres faltam enquanto a senha é digitada', async () => {
    render(<RegisterForm />);
    await fill({ password: 'abc' });
    expect(screen.getByText('Faltam 7 caracteres')).toBeInTheDocument();
  });

  it('envia os dados sem espaços nas pontas e vai para os chamados', async () => {
    mocks.signUp.mockResolvedValue({ id: '1' });
    render(<RegisterForm />);
    await fill({ name: '  Ana Souza ', email: ' ana@empresa.com ', password: 'senha-forte-123' });
    await submit();
    expect(mocks.signUp).toHaveBeenCalledWith('Ana Souza', 'ana@empresa.com', 'senha-forte-123');
    expect(mocks.replace).toHaveBeenCalledWith('/tickets');
  });

  it('mostra "e-mail já cadastrado" junto do campo, sem repetir no topo', async () => {
    mocks.signUp.mockRejectedValue(new ApiError('E-mail já cadastrado', 409));
    render(<RegisterForm />);
    await fill({ name: 'Ana Souza', email: 'ana@empresa.com', password: 'senha-forte-123' });
    await submit();
    expect(await screen.findAllByText('E-mail já cadastrado')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Criar conta' })).toBeEnabled();
  });

  it('traduz o erro de validação da API por campo', async () => {
    mocks.signUp.mockRejectedValue(new ApiError('Dados inválidos', 400, 'req-1', { email: ['email must be an email'] }));
    render(<RegisterForm />);
    await fill({ name: 'Ana Souza', email: 'ana@empresa.com', password: 'senha-forte-123' });
    await submit();
    expect(await screen.findByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByText('Confira os campos destacados.')).toBeInTheDocument();
  });

  it('mostra a mensagem do servidor quando não há campo a apontar (ex.: servidor acordando)', async () => {
    mocks.signUp.mockRejectedValue(new ApiError('O servidor está acordando ou indisponível. Aguarde cerca de um minuto e tente de novo.', 504));
    render(<RegisterForm />);
    await fill({ name: 'Ana Souza', email: 'ana@empresa.com', password: 'senha-forte-123' });
    await submit();
    expect(await screen.findByText(/servidor está acordando/)).toBeInTheDocument();
  });
});

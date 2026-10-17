import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionUser } from '@/lib/types';
import { RequireRole } from './require-role';

const auth = vi.hoisted(() => ({ user: null as SessionUser | null }));
vi.mock('./auth-provider', () => ({ useAuth: () => ({ user: auth.user }) }));

const as = (role: SessionUser['role']): SessionUser => ({ id: '1', name: 'Teste', email: 't@itsm.local', role });

describe('RequireRole', () => {
  beforeEach(() => {
    auth.user = null;
  });

  it('não renderiza nada enquanto não há usuário', () => {
    const { container } = render(<RequireRole roles={['ADMIN']}>segredo</RequireRole>);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o conteúdo para um perfil permitido', () => {
    auth.user = as('MANAGER');
    render(<RequireRole roles={['MANAGER', 'ADMIN']}>painel</RequireRole>);
    expect(screen.getByText('painel')).toBeInTheDocument();
  });

  it('esconde o conteúdo e explica para um perfil sem acesso', () => {
    auth.user = as('REQUESTER');
    render(<RequireRole roles={['MANAGER', 'ADMIN']}>painel</RequireRole>);
    expect(screen.queryByText('painel')).not.toBeInTheDocument();
    expect(screen.getByText('Seu perfil não tem acesso a esta tela.')).toBeInTheDocument();
  });
});

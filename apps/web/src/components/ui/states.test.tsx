import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmptyState, ErrorState, Loading } from './states';

describe('estados', () => {
  it('Loading anuncia o carregamento como status', () => {
    render(<Loading />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando...');
  });

  it('ErrorState é um alerta e oferece nova tentativa só quando há callback', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState message="Falha ao carregar" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao carregar');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    rerender(<ErrorState message="Falha ao carregar" onRetry={onRetry} />);
    await userEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('EmptyState mostra o título e a dica opcional', () => {
    const { rerender } = render(<EmptyState title="Nada por aqui" />);
    expect(screen.getByText('Nada por aqui')).toBeInTheDocument();
    rerender(<EmptyState title="Nada por aqui" hint="Crie o primeiro" />);
    expect(screen.getByText('Crie o primeiro')).toBeInTheDocument();
  });
});

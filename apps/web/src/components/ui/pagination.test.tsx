import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './pagination';

describe('Pagination', () => {
  it('não aparece quando não há resultados', () => {
    const { container } = render(<Pagination page={1} pageSize={25} total={0} onChange={() => undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('mostra o intervalo e a página atual', () => {
    render(<Pagination page={2} pageSize={25} total={60} onChange={() => undefined} />);
    expect(screen.getByText('26–50 de 60')).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('limita o fim do intervalo ao total na última página', () => {
    render(<Pagination page={3} pageSize={25} total={60} onChange={() => undefined} />);
    expect(screen.getByText('51–60 de 60')).toBeInTheDocument();
  });

  it('desabilita anterior na primeira página e próxima na última', () => {
    const { rerender } = render(<Pagination page={1} pageSize={25} total={60} onChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeEnabled();
    rerender(<Pagination page={3} pageSize={25} total={60} onChange={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Próxima página' })).toBeDisabled();
  });

  it('avisa a página escolhida', async () => {
    const onChange = vi.fn();
    render(<Pagination page={2} pageSize={25} total={60} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Próxima página' }));
    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));
    expect(onChange.mock.calls).toEqual([[3], [1]]);
  });
});

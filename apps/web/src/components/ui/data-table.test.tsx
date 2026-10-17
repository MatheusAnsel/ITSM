import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { type Column, DataTable } from './data-table';

interface Row {
  id: number;
  name: string;
}
const columns: Column<Row>[] = [
  { key: 'id', header: 'Número', render: (r) => `#${r.id}` },
  { key: 'name', header: 'Nome', render: (r) => r.name },
];

describe('DataTable', () => {
  it('renderiza cabeçalhos e uma linha por registro', () => {
    render(<DataTable columns={columns} rows={[{ id: 1, name: 'Ana' }, { id: 2, name: 'Bruno' }]} rowKey={(r) => r.id} />);
    expect(screen.getByRole('columnheader', { name: 'Número' })).toBeInTheDocument();
    const body = screen.getAllByRole('row').slice(1);
    expect(body).toHaveLength(2);
    expect(within(body[1]).getByText('Bruno')).toBeInTheDocument();
    expect(within(body[0]).getByText('#1')).toBeInTheDocument();
  });

  it('mostra a mensagem de vazio ocupando todas as colunas', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} empty="Sem chamados" />);
    const cell = screen.getByText('Sem chamados');
    expect(cell).toHaveAttribute('colspan', '2');
  });

  it('usa a mensagem padrão quando não há texto de vazio', () => {
    render(<DataTable columns={columns} rows={[]} rowKey={(r) => r.id} />);
    expect(screen.getByText('Nenhum resultado')).toBeInTheDocument();
  });
});

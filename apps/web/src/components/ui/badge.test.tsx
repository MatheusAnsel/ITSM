import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AssetStatusBadge, AssetTypeBadge, PriorityBadge, SlaBadge, StatusBadge } from './badge';

describe('selos', () => {
  it('mostram o rótulo em português', () => {
    render(
      <>
        <PriorityBadge value="CRITICAL" />
        <StatusBadge value="WAITING_USER" />
        <SlaBadge value="AT_RISK" />
        <AssetStatusBadge value="MAINTENANCE" />
        <AssetTypeBadge value="NOTEBOOK" />
      </>,
    );
    for (const label of ['Crítica', 'Aguardando usuário', 'Em risco', 'Manutenção', 'Notebook']) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('usam o tom vermelho para SLA violado e verde para no prazo', () => {
    render(
      <>
        <SlaBadge value="BREACHED" />
        <SlaBadge value="OK" />
      </>,
    );
    expect(screen.getByText('Violado').className).toContain('text-bad');
    expect(screen.getByText('No prazo').className).toContain('text-ok');
  });
});

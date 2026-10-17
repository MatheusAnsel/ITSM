import { describe, expect, it } from 'vitest';
import { ASSET_STATUS_LABEL, ASSET_TYPE_LABEL, PRIORITY_LABEL, ROLE_LABEL, SLA_LABEL, STATUS_LABEL, transitionLabel } from './labels';
import { ASSET_STATUSES, ASSET_TYPES, PRIORITIES, ROLES, TICKET_STATUSES } from './types';

describe('rótulos', () => {
  it('cobrem todos os valores dos enums', () => {
    expect(Object.keys(PRIORITY_LABEL).sort()).toEqual([...PRIORITIES].sort());
    expect(Object.keys(STATUS_LABEL).sort()).toEqual([...TICKET_STATUSES].sort());
    expect(Object.keys(ASSET_TYPE_LABEL).sort()).toEqual([...ASSET_TYPES].sort());
    expect(Object.keys(ASSET_STATUS_LABEL).sort()).toEqual([...ASSET_STATUSES].sort());
    expect(Object.keys(ROLE_LABEL).sort()).toEqual([...ROLES].sort());
    expect(Object.keys(SLA_LABEL).sort()).toEqual(['AT_RISK', 'BREACHED', 'OK']);
  });
});

describe('transitionLabel', () => {
  it('diferencia reabrir de retomar quando o destino é "em atendimento"', () => {
    expect(transitionLabel('RESOLVED', 'IN_PROGRESS')).toBe('Reabrir chamado');
    expect(transitionLabel('WAITING_USER', 'IN_PROGRESS')).toBe('Retomar atendimento');
    expect(transitionLabel('OPEN', 'IN_PROGRESS')).toBe('Iniciar atendimento');
  });
  it('rotula as demais transições pelo destino', () => {
    expect(transitionLabel('IN_PROGRESS', 'RESOLVED')).toBe('Marcar como resolvido');
    expect(transitionLabel('RESOLVED', 'CLOSED')).toBe('Fechar chamado');
    expect(transitionLabel('OPEN', 'CANCELLED')).toBe('Cancelar chamado');
    expect(transitionLabel('IN_PROGRESS', 'WAITING_USER')).toBe('Aguardar usuário');
  });
});

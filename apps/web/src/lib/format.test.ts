import { describe, expect, it } from 'vitest';
import { formatBytes, formatDate, formatDuration, initials, slaText } from './format';

describe('formatDuration', () => {
  it('mostra traço quando não há valor', () => {
    expect(formatDuration(null)).toBe('—');
  });
  it('usa minutos abaixo de uma hora', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(59.4)).toBe('59 min');
  });
  it('usa horas com uma casa decimal e vírgula até 10 h', () => {
    expect(formatDuration(90)).toBe('1,5 h');
    expect(formatDuration(60)).toBe('1,0 h');
  });
  it('arredonda horas sem casa decimal a partir de 10 h', () => {
    expect(formatDuration(10 * 60)).toBe('10 h');
    expect(formatDuration(47 * 60)).toBe('47 h');
  });
  it('passa para dias a partir de 48 h', () => {
    expect(formatDuration(48 * 60)).toBe('2 d');
    expect(formatDuration(72 * 60)).toBe('3 d');
  });
});

describe('formatBytes', () => {
  it('escolhe a unidade pelo tamanho', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1,5 MB');
  });
});

describe('initials', () => {
  it('usa a primeira e a última palavra, em caixa alta', () => {
    expect(initials('maria da silva')).toBe('MS');
  });
  it('aceita um nome só e ignora espaços extras', () => {
    expect(initials('  ana ')).toBe('A');
  });
  it('devolve ? para nome vazio', () => {
    expect(initials('   ')).toBe('?');
  });
});

describe('formatDate', () => {
  it('não volta um dia por causa do fuso (data de compra é só o dia)', () => {
    expect(formatDate('2026-03-01T00:00:00.000Z')).toBe('01/03/2026');
  });
});

describe('slaText', () => {
  const now = Date.parse('2026-10-16T12:00:00.000Z');
  const base = { resolvedAt: null, slaPausedAt: null, status: 'OPEN' as const };

  it('informa o tempo restante quando o prazo ainda não venceu', () => {
    expect(slaText({ ...base, resolutionDueAt: '2026-10-16T15:00:00.000Z' }, now)).toBe('Vence em 3,0 h');
  });
  it('informa o atraso quando o prazo já passou', () => {
    expect(slaText({ ...base, resolutionDueAt: '2026-10-16T10:00:00.000Z' }, now)).toBe('Venceu há 2,0 h');
  });
  it('mostra Pausado quando o relógio está parado', () => {
    expect(slaText({ ...base, slaPausedAt: '2026-10-16T11:00:00.000Z', resolutionDueAt: '2026-10-16T10:00:00.000Z' }, now)).toBe('Pausado');
  });
  it('mostra Concluído para chamado resolvido ou fechado', () => {
    expect(slaText({ ...base, resolvedAt: '2026-10-16T11:00:00.000Z', resolutionDueAt: '2026-10-16T10:00:00.000Z' }, now)).toBe('Concluído');
    expect(slaText({ ...base, status: 'CLOSED', resolutionDueAt: '2026-10-16T10:00:00.000Z' }, now)).toBe('Concluído');
  });
  it('mostra traço para chamado cancelado', () => {
    expect(slaText({ ...base, status: 'CANCELLED', resolutionDueAt: '2026-10-16T10:00:00.000Z' }, now)).toBe('—');
  });
});

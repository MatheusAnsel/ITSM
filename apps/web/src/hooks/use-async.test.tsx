import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { useAsync } from './use-async';

describe('useAsync', () => {
  it('começa carregando e entrega os dados', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.resolve('ok'), []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBe('ok');
    expect(result.current.error).toBeNull();
  });

  it('expõe a mensagem e o status quando a API devolve erro', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject(new ApiError('Sem permissão', 403)), []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Sem permissão');
    expect(result.current.errorStatus).toBe(403);
  });

  it('usa mensagem genérica para erros que não vêm da API', async () => {
    const { result } = renderHook(() => useAsync(() => Promise.reject(new Error('boom')), []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Erro inesperado');
    expect(result.current.errorStatus).toBeNull();
  });

  it('refaz a busca quando as dependências mudam e mantém o último dado durante o carregamento', async () => {
    const load = vi.fn((q: string) => Promise.resolve(`resultado ${q}`));
    const { result, rerender } = renderHook(({ q }) => useAsync(() => load(q), [q]), { initialProps: { q: 'a' } });
    await waitFor(() => expect(result.current.data).toBe('resultado a'));
    rerender({ q: 'b' });
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe('resultado a');
    await waitFor(() => expect(result.current.data).toBe('resultado b'));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('descarta a resposta antiga quando a dependência muda antes dela chegar', async () => {
    let resolveFirst: (v: string) => void = () => undefined;
    const load = vi.fn((q: string) =>
      q === 'lenta' ? new Promise<string>((r) => (resolveFirst = r)) : Promise.resolve('rápida'),
    );
    const { result, rerender } = renderHook(({ q }) => useAsync(() => load(q), [q]), { initialProps: { q: 'lenta' } });
    rerender({ q: 'rapida' });
    await waitFor(() => expect(result.current.data).toBe('rápida'));
    await act(async () => resolveFirst('antiga'));
    expect(result.current.data).toBe('rápida');
  });

  it('reload refaz a busca com as mesmas dependências', async () => {
    const load = vi.fn(() => Promise.resolve('x'));
    const { result } = renderHook(() => useAsync(load, []));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.reload());
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
});

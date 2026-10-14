'use client';

import { useCallback, useEffect, useEffectEvent, useState } from 'react';
import { ApiError } from '@/lib/api';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  errorStatus: number | null;
  // true enquanto há uma busca em andamento; `data` mantém o último resultado até chegar o novo.
  loading: boolean;
  reload: () => void;
}

interface Settled<T> {
  token: string;
  data: T | null;
  error: string | null;
  errorStatus: number | null;
}

// Carrega dados e refaz a busca quando as dependências mudam. Respostas antigas são descartadas
// para que um filtro trocado rápido não exiba o resultado da busca anterior.
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({ token: '', data: null, error: null, errorStatus: null });
  const token = `${JSON.stringify(deps)}#${tick}`;
  const run = useEffectEvent(load);

  useEffect(() => {
    let cancelled = false;
    run().then(
      (data) => {
        if (!cancelled) setSettled({ token, data, error: null, errorStatus: null });
      },
      (e: unknown) => {
        if (cancelled) return;
        setSettled((prev) => ({
          token,
          data: prev.data,
          error: e instanceof ApiError ? e.message : 'Erro inesperado',
          errorStatus: e instanceof ApiError ? e.status : null,
        }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  const current = settled.token === token;
  return {
    data: settled.data,
    error: current ? settled.error : null,
    errorStatus: current ? settled.errorStatus : null,
    loading: !current,
    reload,
  };
}

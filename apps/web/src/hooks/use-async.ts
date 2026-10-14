'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api';

export interface AsyncState<T> {
  data: T | null;
  error: string | null;
  errorStatus: number | null;
  loading: boolean;
  reload: () => void;
}

// Carrega dados e refaz a busca quando as dependências mudam. Respostas antigas são descartadas
// para que um filtro trocado rápido não exiba o resultado da busca anterior.
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    const id = ++latest.current;
    setLoading(true);
    loadRef
      .current()
      .then((value) => {
        if (id !== latest.current) return;
        setData(value);
        setError(null);
        setErrorStatus(null);
      })
      .catch((e: unknown) => {
        if (id !== latest.current) return;
        setError(e instanceof ApiError ? e.message : 'Erro inesperado');
        setErrorStatus(e instanceof ApiError ? e.status : null);
      })
      .finally(() => {
        if (id === latest.current) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { data, error, errorStatus, loading, reload };
}

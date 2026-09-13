import { useCallback, useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { listClients } from '../api/clients-api';
import type { ClientPage } from '../types/client';

export type ActiveFilter = '' | 'true' | 'false';

const PAGE_SIZE = 10;

/**
 * Lista de clientes com busca (com debounce), filtro de situação e paginação.
 *
 * `loading` é ligado nos manipuladores de evento (busca, filtro, página,
 * recarregar) e desligado no fim da requisição — o efeito só conversa com a
 * API, sem setState síncrono.
 */
export function useClients() {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('true');
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);
  const [data, setData] = useState<ClientPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebouncedValue(search, 400);

  useEffect(() => {
    const controller = new AbortController();

    listClients(
      {
        page,
        pageSize: PAGE_SIZE,
        search: debouncedSearch.trim() || undefined,
        active: activeFilter || undefined,
      },
      controller.signal,
    )
      .then((result) => {
        if (controller.signal.aborted) return;
        setData(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setData(null);
        setError(describeApiError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, debouncedSearch, activeFilter, reloadToken]);

  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    setLoading(true);
  }, []);

  const changeFilter = useCallback((value: ActiveFilter) => {
    setActiveFilter(value);
    setPage(1);
    setLoading(true);
  }, []);

  const changePage = useCallback((value: number) => {
    setPage(value);
    setLoading(true);
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  return {
    data,
    loading,
    error,
    page,
    search,
    activeFilter,
    changeSearch,
    changeFilter,
    changePage,
    reload,
  };
}

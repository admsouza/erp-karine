import { useCallback, useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { listUsers, type UsersFiltros } from '../api/users-api';
import type { AdminUser } from '../types/user';

const TAMANHO_PAGINA = 20;

const FILTROS_VAZIOS: UsersFiltros = { search: '', role: '', active: '' };

/** Lista de usuários com filtros e paginação. */
export function useUsers() {
  const [filtros, setFiltros] = useState<UsersFiltros>(FILTROS_VAZIOS);
  const [aplicados, setAplicados] = useState<UsersFiltros>(FILTROS_VAZIOS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listUsers(aplicados, page, TAMANHO_PAGINA, controller.signal)
      .then((pagina) => {
        if (controller.signal.aborted) return;
        setItems(pagina.items);
        setTotal(pagina.total);
        setError(null);
      })
      .catch((falha: unknown) => {
        if (controller.signal.aborted) return;
        setItems([]);
        setTotal(0);
        setError(describeApiError(falha));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [aplicados, page, token]);

  const alterar = useCallback((campo: keyof UsersFiltros, valor: string) => {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }, []);

  const aplicar = useCallback(() => {
    setLoading(true);
    setPage(1);
    setAplicados(filtros);
  }, [filtros]);

  const limpar = useCallback(() => {
    setLoading(true);
    setFiltros(FILTROS_VAZIOS);
    setAplicados(FILTROS_VAZIOS);
    setPage(1);
  }, []);

  const irPara = useCallback((proxima: number) => {
    setLoading(true);
    setPage(proxima);
  }, []);

  const recarregar = useCallback(() => {
    setLoading(true);
    setToken((atual) => atual + 1);
  }, []);

  return {
    filtros, alterar, aplicar, limpar,
    items, total, page, totalPages: Math.max(Math.ceil(total / TAMANHO_PAGINA), 1), pageSize: TAMANHO_PAGINA, irPara,
    loading, error, recarregar,
  };
}

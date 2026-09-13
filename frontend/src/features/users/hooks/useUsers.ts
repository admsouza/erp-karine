import { useCallback, useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { listUsers, type UsersFiltros } from '../api/users-api';
import type { AdminUser } from '../types/user';

const TAMANHO_PAGINA = 20;

const FILTROS_VAZIOS: UsersFiltros = { search: '', role: '', active: '' };

/**
 * Lista de usuários com filtros e paginação.
 *
 * `loading` é **derivado** do token de busca (`carregadoToken !== token`) e cada ação
 * — aplicar, limpar, trocar de página ou recarregar — sobe o token, que está nas
 * dependências do efeito. Antes, o `loading` era ligado à mão e dependia do efeito
 * re-disparar: "Limpar filtros" com os filtros já vazios não mudava estado nenhum,
 * o efeito não rodava e a tela ficava presa em "Carregando…" (decisão 7.51).
 */
export function useUsers() {
  const [filtros, setFiltros] = useState<UsersFiltros>(FILTROS_VAZIOS);
  const [aplicados, setAplicados] = useState<UsersFiltros>(FILTROS_VAZIOS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);
  const [carregadoToken, setCarregadoToken] = useState(-1);
  const loading = carregadoToken !== token;

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
        if (!controller.signal.aborted) setCarregadoToken(token);
      });
    return () => controller.abort();
  }, [aplicados, page, token]);

  const buscar = useCallback(() => setToken((atual) => atual + 1), []);

  const alterar = useCallback((campo: keyof UsersFiltros, valor: string) => {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }, []);

  const aplicar = useCallback(() => {
    setPage(1);
    setAplicados({ ...filtros });
    buscar();
  }, [filtros, buscar]);

  const limpar = useCallback(() => {
    setFiltros(FILTROS_VAZIOS);
    setAplicados({ ...FILTROS_VAZIOS });
    setPage(1);
    buscar();
  }, [buscar]);

  const irPara = useCallback(
    (proxima: number) => {
      setPage(proxima);
      buscar();
    },
    [buscar],
  );

  const recarregar = useCallback(() => buscar(), [buscar]);

  return {
    filtros, alterar, aplicar, limpar,
    items, total, page, totalPages: Math.max(Math.ceil(total / TAMANHO_PAGINA), 1), pageSize: TAMANHO_PAGINA, irPara,
    loading, error, recarregar,
  };
}

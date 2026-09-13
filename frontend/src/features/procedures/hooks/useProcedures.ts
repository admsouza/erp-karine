import { useCallback, useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { listProcedures } from '../api/procedures-api';
import type { Procedure } from '../types/procedure';
import type { PaginatedResult } from '../../../shared/types/api';

const TAMANHO_PAGINA = 10;

export function useProcedures() {
  const [search, setSearch] = useState('');
  const [situacao, setSituacao] = useState<'' | 'true' | 'false'>('true');
  const [page, setPage] = useState(1);
  const [dados, setDados] = useState<PaginatedResult<Procedure> | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [tokenRecarga, setTokenRecarga] = useState(0);

  const buscaDebounced = useDebouncedValue(search, 400);

  useEffect(() => {
    let ativo = true;

    listProcedures({
      page,
      pageSize: TAMANHO_PAGINA,
      search: buscaDebounced || undefined,
      active: situacao || undefined,
    })
      .then((resposta) => {
        if (!ativo) return;
        setDados(resposta);
        setErro(null);
      })
      .catch((falha) => {
        if (!ativo) return;
        setErro(describeApiError(falha));
        setDados(null);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [page, buscaDebounced, situacao, tokenRecarga]);

  const changeSearch = useCallback((valor: string) => {
    setSearch(valor);
    setPage(1);
    setLoading(true);
  }, []);

  const changeSituacao = useCallback((valor: '' | 'true' | 'false') => {
    setSituacao(valor);
    setPage(1);
    setLoading(true);
  }, []);

  const changePage = useCallback((valor: number) => {
    setPage(valor);
    setLoading(true);
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setTokenRecarga((token) => token + 1);
  }, []);

  return { dados, loading, erro, page, search, situacao, changeSearch, changeSituacao, changePage, reload };
}

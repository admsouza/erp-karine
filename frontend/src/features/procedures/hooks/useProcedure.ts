import { useCallback, useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { getProcedure, listProcedurePrices, removeProcedurePrice } from '../api/procedures-api';
import type { Procedure, ProcedurePrice } from '../types/procedure';

/** Procedimento + série histórica de valores. */
export function useProcedure(id: string | undefined) {
  const [procedure, setProcedure] = useState<Procedure | null>(null);
  const [prices, setPrices] = useState<ProcedurePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);
  const [tokenRecarga, setTokenRecarga] = useState(0);

  useEffect(() => {
    if (!id) return;

    let ativo = true;
    Promise.all([getProcedure(id), listProcedurePrices(id)])
      .then(([procedimento, vigencias]) => {
        if (!ativo) return;
        setProcedure(procedimento);
        setPrices(vigencias);
        setErro(null);
      })
      .catch((falha) => {
        if (!ativo) return;
        setErro(describeApiError(falha));
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });

    return () => {
      ativo = false;
    };
  }, [id, tokenRecarga]);

  const reload = useCallback(() => {
    setLoading(true);
    setTokenRecarga((token) => token + 1);
  }, []);

  const removePrice = useCallback(
    async (priceId: string) => {
      if (!id) return;
      setErroAcao(null);
      try {
        await removeProcedurePrice(id, priceId);
        reload();
      } catch (falha) {
        setErroAcao(describeApiError(falha));
      }
    },
    [id, reload],
  );

  // Sem id não há o que buscar: o estado é derivado, sem setState dentro do efeito.
  const semIdentificador = !id;

  return {
    procedure,
    prices,
    loading: semIdentificador ? false : loading,
    erro: semIdentificador ? 'Procedimento não informado.' : erro,
    erroAcao,
    reload,
    removePrice,
  };
}

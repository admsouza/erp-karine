import { useCallback, useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { auditFilterOptions, listAuditEvents } from '../api/audit-api';
import { EMPTY_AUDIT_FILTERS, type AuditEvent, type AuditFilterOptions, type AuditFilters } from '../types/audit';

const TAMANHO_PAGINA = 20;

/**
 * Consulta da trilha de auditoria.
 *
 * O `loading` é ligado no handler (e nos filtros) e desligado no `finally`, para não
 * disparar `setState` síncrono dentro do efeito (regra `react(set-state-in-effect)`).
 */
export function useAudit() {
  const [filtros, setFiltros] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
  const [aplicados, setAplicados] = useState<AuditFilters>(EMPTY_AUDIT_FILTERS);
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AuditEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [opcoes, setOpcoes] = useState<AuditFilterOptions>({ actors: [], modules: [], entityTypes: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    listAuditEvents(aplicados, page, TAMANHO_PAGINA, controller.signal)
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

  useEffect(() => {
    const controller = new AbortController();
    auditFilterOptions(controller.signal)
      .then((dados) => {
        if (!controller.signal.aborted) setOpcoes(dados);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [token]);

  const alterar = useCallback((campo: keyof AuditFilters, valor: string) => {
    setFiltros((atual) => ({ ...atual, [campo]: valor }));
  }, []);

  const aplicar = useCallback(() => {
    setLoading(true);
    setPage(1);
    setAplicados(filtros);
  }, [filtros]);

  const limpar = useCallback(() => {
    setLoading(true);
    setFiltros(EMPTY_AUDIT_FILTERS);
    setAplicados(EMPTY_AUDIT_FILTERS);
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
    opcoes, loading, error, recarregar,
    temFiltro: Object.values(aplicados).some((valor) => valor !== ''),
  };
}

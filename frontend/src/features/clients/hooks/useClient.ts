import { useCallback, useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { getClient } from '../api/clients-api';
import type { Client } from '../types/client';

/** Carrega um cliente pelo id. `loading` começa ligado e é ligado de novo no reload. */
export function useClient(id: string | undefined) {
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();

    getClient(id, controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return;
        setClient(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setClient(null);
        setError(describeApiError(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadToken]);

  const reload = useCallback(() => {
    setLoading(true);
    setReloadToken((token) => token + 1);
  }, []);

  /** Substitui o cliente em memória após uma ação (ex.: inativar). */
  const replace = useCallback((updated: Client) => {
    setClient(updated);
    setError(null);
  }, []);

  return { client, loading, error, reload, replace };
}

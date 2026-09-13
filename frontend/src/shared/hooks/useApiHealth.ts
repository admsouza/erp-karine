import { useEffect, useState } from 'react';
import { http } from '../api/http-client';
import type { HealthStatus } from '../types/api';

export type ApiConnectionState = 'checking' | 'online' | 'offline';

/** Consulta o /api/health para exibir o status da conexão na barra superior. */
export function useApiHealth(): ApiConnectionState {
  const [state, setState] = useState<ApiConnectionState>('checking');

  useEffect(() => {
    let active = true;

    http
      .get<HealthStatus>('/health')
      .then((response) => {
        if (active) {
          setState(response.data.database === 'up' ? 'online' : 'offline');
        }
      })
      .catch(() => {
        if (active) {
          setState('offline');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return state;
}

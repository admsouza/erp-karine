import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { HealthStatus } from '../types';

type ApiState = 'checking' | 'online' | 'offline';

/** Consulta o /api/health para exibir o status da conexão na barra superior. */
export function useApiHealth(): ApiState {
  const [state, setState] = useState<ApiState>('checking');

  useEffect(() => {
    let active = true;

    api
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

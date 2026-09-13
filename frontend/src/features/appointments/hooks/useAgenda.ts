import { useCallback, useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { listDaily, listWeekly } from '../api/appointments-api';
import type { Appointment } from '../types/appointment';

export type AgendaView = 'day' | 'week';
export function useAgenda(initialDate: string) {
  const [date, setDate] = useState(initialDate); const [view, setView] = useState<AgendaView>('day');
  const [items, setItems] = useState<Appointment[]>([]); const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); const [reloadToken, setReloadToken] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const load = view === 'day' ? listDaily : listWeekly;
    load(date, controller.signal).then((data) => { if (!controller.signal.aborted) { setItems(data); setError(null); } })
      .catch((failure) => { if (!controller.signal.aborted) setError(describeApiError(failure)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [date, view, reloadToken]);
  const changeDate = useCallback((value: string) => { setLoading(true); setDate(value); }, []);
  const changeView = useCallback((value: AgendaView) => { setLoading(true); setView(value); }, []);
  const reload = useCallback(() => { setLoading(true); setReloadToken((value) => value + 1); }, []);
  return { date, view, items, loading, error, changeDate, changeView, reload };
}

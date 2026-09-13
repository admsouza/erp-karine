import { http } from '../../../shared/api/http-client';
import type { AuditEventPage, AuditFilterOptions, AuditFilters } from '../types/audit';

function somentePreenchidos(filtros: AuditFilters & { page: number; pageSize: number }) {
  return Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== '' && valor !== undefined));
}

export const listAuditEvents = async (
  filtros: AuditFilters,
  page: number,
  pageSize: number,
  signal?: AbortSignal,
) => (await http.get<AuditEventPage>('/audit/events', { params: somentePreenchidos({ ...filtros, page, pageSize }), signal })).data;

export const auditFilterOptions = async (signal?: AbortSignal) =>
  (await http.get<AuditFilterOptions>('/audit/filters', { signal })).data;

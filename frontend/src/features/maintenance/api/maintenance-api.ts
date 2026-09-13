import { http } from '../../../shared/api/http-client';
import type {
  MaintenanceItem,
  MaintenancePage,
  MaintenanceType,
} from '../types/maintenance';

export const listMaintenance = async (
  input: {
    type: MaintenanceType;
    search?: string;
    active?: 'true' | 'false';
    page?: number;
    pageSize?: number;
  },
  signal?: AbortSignal,
) =>
  (
    await http.get<MaintenancePage>('/maintenance/registrations', {
      params: input,
      signal,
    })
  ).data;

export const getMaintenanceSummary = async () =>
  (
    await http.get<{ counts: Record<MaintenanceType, number> }>(
      '/maintenance/summary',
    )
  ).data;

/** Catálogo de identificações de local — endpoint público do módulo financeiro. */
export const listAccountSuggestions = async () =>
  (
    await http.get<{ id: string; name: string; kind: 'CASH' | 'BANK' | 'CARD'; active: boolean }[]>(
      '/financial/account-suggestions',
      { params: { active: 'true' } },
    )
  ).data;

/** Cria a identificação sugerida (único tipo que o hub cria — é o catálogo que ele mantém). */
export const createMaintenanceItem = async (
  type: MaintenanceType,
  input: { name: string; kind?: string },
) =>
  (
    await http.post<MaintenanceItem>(`/maintenance/registrations/${type}`, input)
  ).data;

export const updateMaintenanceItem = async (
  type: MaintenanceType,
  id: string,
  input: {
    name?: string;
    kind?: string;
    phone?: string;
    unit?: string;
    priceCents?: number;
  },
) =>
  (
    await http.patch<MaintenanceItem>(
      `/maintenance/registrations/${type}/${id}`,
      input,
    )
  ).data;

export const inactivateMaintenanceItem = async (
  type: MaintenanceType,
  id: string,
) =>
  (await http.patch(`/maintenance/registrations/${type}/${id}/inactivate`)).data;

export const reactivateMaintenanceItem = async (
  type: MaintenanceType,
  id: string,
) =>
  (await http.patch(`/maintenance/registrations/${type}/${id}/reactivate`)).data;

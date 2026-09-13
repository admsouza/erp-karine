import { http } from '../../../shared/api/http-client';
import type { AdminUser, Role, UsersPage } from '../types/user';

export interface UsersFiltros {
  search: string;
  role: Role | '';
  active: 'true' | 'false' | '';
}

function somentePreenchidos(params: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(params).filter(([, valor]) => valor !== '' && valor !== undefined));
}

export const listUsers = async (filtros: UsersFiltros, page: number, pageSize: number, signal?: AbortSignal) =>
  (await http.get<UsersPage>('/users', { params: somentePreenchidos({ ...filtros, page, pageSize }), signal })).data;

export const createUser = async (input: { name: string; email: string; password: string; role: Role }) =>
  (await http.post<AdminUser>('/users', input)).data;

export const changeUserRole = async (id: string, role: Role) =>
  (await http.patch<AdminUser>(`/users/${id}/role`, { role })).data;

export const setUserActive = async (id: string, active: boolean) =>
  (await http.patch<AdminUser>(`/users/${id}/${active ? 'reactivate' : 'inactivate'}`)).data;

export const resetUserPassword = async (id: string, password: string) =>
  (await http.post<{ id: string; sessoesEncerradas: number }>(`/users/${id}/password`, { password })).data;

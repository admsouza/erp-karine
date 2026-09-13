import { http } from '../../../shared/api/http-client';
import type { Client, ClientInput, ClientListParams, ClientPage } from '../types/client';

const BASE = '/clients';

export async function listClients(params: ClientListParams, signal?: AbortSignal): Promise<ClientPage> {
  const { data } = await http.get<ClientPage>(BASE, { params, signal });
  return data;
}

export async function getClient(id: string, signal?: AbortSignal): Promise<Client> {
  const { data } = await http.get<Client>(`${BASE}/${id}`, { signal });
  return data;
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data } = await http.post<Client>(BASE, input);
  return data;
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data } = await http.patch<Client>(`${BASE}/${id}`, input);
  return data;
}

/** Inativa o cliente (soft delete: o histórico permanece no banco). */
export async function inactivateClient(id: string): Promise<Client> {
  const { data } = await http.patch<Client>(`${BASE}/${id}/inactivate`);
  return data;
}

export async function reactivateClient(id: string): Promise<Client> {
  const { data } = await http.patch<Client>(`${BASE}/${id}/reactivate`);
  return data;
}

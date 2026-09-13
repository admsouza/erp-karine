import { http } from '../../../shared/api/http-client';
import type { PaginatedResult } from '../../../shared/types/api';
import type { Procedure, ProcedureInput, ProcedureListParams } from '../types/procedure';

const BASE = '/procedures';

export async function listProcedures(params: ProcedureListParams): Promise<PaginatedResult<Procedure>> {
  const { data } = await http.get<PaginatedResult<Procedure>>(BASE, { params });
  return data;
}

export async function getProcedure(id: string): Promise<Procedure> {
  const { data } = await http.get<Procedure>(`${BASE}/${id}`);
  return data;
}

export async function createProcedure(input: ProcedureInput): Promise<Procedure> {
  const { data } = await http.post<Procedure>(BASE, input);
  return data;
}

export async function updateProcedure(id: string, input: Partial<ProcedureInput>): Promise<Procedure> {
  const { data } = await http.patch<Procedure>(`${BASE}/${id}`, input);
  return data;
}

export async function setProcedureActive(id: string, active: boolean): Promise<Procedure> {
  const acao = active ? 'reactivate' : 'inactivate';
  const { data } = await http.patch<Procedure>(`${BASE}/${id}/${acao}`);
  return data;
}

import { http } from '../../../shared/api/http-client';
import type { PaginatedResult } from '../../../shared/types/api';
import type {
  NewPriceInput,
  Procedure,
  ProcedureInput,
  ProcedureListParams,
  ProcedurePrice,
} from '../types/procedure';

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

/** Histórico de valores (vigências), do mais recente para o mais antigo. */
export async function listProcedurePrices(id: string): Promise<ProcedurePrice[]> {
  const { data } = await http.get<ProcedurePrice[]>(`${BASE}/${id}/prices`);
  return data;
}

/** Novo valor: cria a vigência e fecha a anterior. */
export async function addProcedurePrice(id: string, input: NewPriceInput): Promise<ProcedurePrice> {
  const { data } = await http.post<ProcedurePrice>(`${BASE}/${id}/prices`, input);
  return data;
}

/** Remove uma vigência (correção); a anterior volta a valer. */
export async function removeProcedurePrice(id: string, priceId: string): Promise<void> {
  await http.delete(`${BASE}/${id}/prices/${priceId}`);
}

/** Valor unitário que valia em uma data (AAAA-MM-DD). */
export async function getProcedurePriceOn(id: string, date: string): Promise<number | null> {
  const { data } = await http.get<{ valueCents: number | null }>(`${BASE}/${id}/price-on`, { params: { date } });
  return data.valueCents;
}

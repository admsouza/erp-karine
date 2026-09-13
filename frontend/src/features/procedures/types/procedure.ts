export interface Procedure {
  id: string;
  name: string;
  description: string | null;
  /** Valor padrão em centavos. */
  defaultValueCents: number;
  durationMinutes: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Payload de cadastro/edição: o valor trafega em centavos, como no backend. */
export interface ProcedureInput {
  name: string;
  description?: string;
  defaultValueCents?: number;
  durationMinutes?: number;
}

export interface ProcedureListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: 'true' | 'false';
}

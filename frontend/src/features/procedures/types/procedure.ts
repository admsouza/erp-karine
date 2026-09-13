export interface Procedure {
  id: string;
  name: string;
  description: string | null;
  /**
   * Valor unitário vigente em centavos, derivado da série de vigências.
   * `null` quando o procedimento ainda não tem valor cadastrado.
   */
  currentValueCents: number | null;
  durationMinutes: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Vigência de valor: vale de `validFrom` até `validTo` (exclusivo). */
export interface ProcedurePrice {
  id: string;
  valueCents: number;
  validFrom: string;
  validTo: string | null;
  note: string | null;
  createdAt: string;
}

/** Cadastro/edição. O valor entra só no cadastro e vira a primeira vigência. */
export interface ProcedureInput {
  name: string;
  description?: string;
  durationMinutes?: number;
  /** Somente no cadastro. */
  initialValueCents?: number;
}

export interface NewPriceInput {
  valueCents: number;
  /** AAAA-MM-DD */
  validFrom?: string;
  note?: string;
}

export interface ProcedureListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: 'true' | 'false';
}

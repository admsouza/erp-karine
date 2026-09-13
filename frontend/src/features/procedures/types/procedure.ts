/** Unidade de medida pela qual o valor unitário é cobrado. */
import { formatCentsToBRL } from '../../../shared/utils/format';

export type ProcedureUnit =
  | 'SESSAO'
  | 'APLICACAO'
  | 'REGIAO'
  | 'ML'
  | 'UNIDADE'
  | 'HORA'
  | 'PACOTE';

export const PROCEDURE_UNITS: { value: ProcedureUnit; label: string; singular: string }[] = [
  { value: 'SESSAO', label: 'Sessão', singular: 'sessão' },
  { value: 'APLICACAO', label: 'Aplicação', singular: 'aplicação' },
  { value: 'REGIAO', label: 'Região', singular: 'região' },
  { value: 'ML', label: 'Mililitro (ml)', singular: 'ml' },
  { value: 'UNIDADE', label: 'Unidade (U)', singular: 'unidade' },
  { value: 'HORA', label: 'Hora', singular: 'hora' },
  { value: 'PACOTE', label: 'Pacote/Combo', singular: 'pacote' },
];

/** "R$ 900,00 / região" */
export function formatUnitValue(valueCents: number | null, unit: ProcedureUnit | undefined): string {
  const rotulo = PROCEDURE_UNITS.find((u) => u.value === unit)?.singular ?? 'sessão';
  if (valueCents === null) return 'sem valor';
  return `${formatCentsToBRL(valueCents)} / ${rotulo}`;
}

export interface Procedure {
  id: string;
  name: string;
  description: string | null;
  /** Unidade de medida pela qual o valor unitário é cobrado. */
  unit: ProcedureUnit;
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
  unit?: ProcedureUnit;
  durationMinutes?: number;
  /** Somente no cadastro. */
  initialValueCents?: number;
}

/** Correção da vigência atual (só valor e observação). */
export interface UpdatePriceInput {
  valueCents?: number;
  note?: string;
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

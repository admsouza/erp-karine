import type { ProcedurePrice as ProcedurePriceModel } from '../../../generated/prisma/client.js';

/**
 * Vigência de valor de um procedimento.
 *
 * `validTo = null` = vigência atual (em aberto). O histórico nunca é reescrito:
 * mudar o preço cria uma vigência nova e fecha a anterior.
 */
export interface ProcedurePriceEntity {
  id: string;
  procedureId: string;
  /** Valor unitário em **centavos** (nunca float). */
  valueCents: number;
  validFrom: Date;
  validTo: Date | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toProcedurePriceEntity(model: ProcedurePriceModel): ProcedurePriceEntity {
  return {
    id: model.id,
    procedureId: model.procedureId,
    valueCents: model.valueCents,
    validFrom: model.validFrom,
    validTo: model.validTo,
    note: model.note,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

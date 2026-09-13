import type { Procedure as ProcedureModel } from '../../../generated/prisma/client.js';

/** Procedimento do catálogo da clínica. */
export interface ProcedureEntity {
  id: string;
  name: string;
  description: string | null;
  /**
   * Valor unitário **vigente** em centavos, derivado da série de vigências
   * (`ProcedurePrice`). `null` quando o procedimento ainda não tem valor.
   */
  currentValueCents: number | null;
  durationMinutes: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toProcedureEntity(
  model: ProcedureModel,
  currentValueCents: number | null,
): ProcedureEntity {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    currentValueCents,
    durationMinutes: model.durationMinutes,
    active: model.active,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

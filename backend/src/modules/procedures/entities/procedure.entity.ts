import type { Procedure as ProcedureModel } from '../../../generated/prisma/client.js';

/** Procedimento do catálogo da clínica. */
export interface ProcedureEntity {
  id: string;
  name: string;
  description: string | null;
  /** Valor padrão em **centavos** (nunca float). */
  defaultValueCents: number;
  durationMinutes: number | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toProcedureEntity(model: ProcedureModel): ProcedureEntity {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    defaultValueCents: model.defaultValueCents,
    durationMinutes: model.durationMinutes,
    active: model.active,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

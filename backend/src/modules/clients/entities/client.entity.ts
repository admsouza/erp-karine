import type { Client } from '../../../generated/prisma/client.js';

/**
 * Cliente no vocabulário do domínio (sem tipos do Prisma).
 * O restante do sistema (inclusive outros módulos) deve usar este tipo, nunca o modelo do ORM.
 */
export interface ClientEntity {
  id: string;
  fullName: string;
  cpf: string | null;
  birthDate: Date | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Converte o registro persistido no cliente de domínio. */
export function toClientEntity(model: Client): ClientEntity {
  return {
    id: model.id,
    fullName: model.fullName,
    cpf: model.cpf,
    birthDate: model.birthDate,
    phone: model.phone,
    whatsapp: model.whatsapp,
    email: model.email,
    address: model.address,
    notes: model.notes,
    active: model.active,
    deactivatedAt: model.deactivatedAt,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

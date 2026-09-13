import type { Product as ProductModel } from '../../../generated/prisma/client.js';

/** Produto do catálogo da clínica (vendido além dos procedimentos). */
export interface ProductEntity {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  priceCents: number;
  active: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductEntity(model: ProductModel): ProductEntity {
  return {
    id: model.id,
    name: model.name,
    description: model.description,
    unit: model.unit,
    priceCents: model.priceCents,
    active: model.active,
    deactivatedAt: model.deactivatedAt,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

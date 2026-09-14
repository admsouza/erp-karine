import type { Product as ProductModel, ProductCommercialUse } from '../../../generated/prisma/client.js';

/** Produto de venda ao cliente, compra de credor, ou ambos. */
export interface ProductEntity {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  priceCents: number;
  purchasePriceCents: number;
  commercialUse: ProductCommercialUse;
  active: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toProductEntity(model: ProductModel): ProductEntity {
  return { id: model.id, name: model.name, description: model.description, unit: model.unit, priceCents: model.priceCents, purchasePriceCents: model.purchasePriceCents, commercialUse: model.commercialUse, active: model.active, deactivatedAt: model.deactivatedAt, createdAt: model.createdAt, updatedAt: model.updatedAt };
}

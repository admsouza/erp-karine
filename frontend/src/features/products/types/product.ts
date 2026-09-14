export const PRODUCT_COMMERCIAL_USES = { VENDA: 'Venda ao cliente', COMPRA: 'Compra de credor', AMBOS: 'Venda e compra' } as const;
export type ProductCommercialUse = keyof typeof PRODUCT_COMMERCIAL_USES;
export interface Product { id: string; name: string; description: string | null; unit: string | null; priceCents: number; purchasePriceCents: number; commercialUse: ProductCommercialUse; active: boolean; deactivatedAt: string | null; updatedAt: string; }
export interface ProductPage { items: Product[]; total: number; page: number; pageSize: number; }

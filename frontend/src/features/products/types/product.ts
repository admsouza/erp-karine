export interface Product {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  priceCents: number;
  active: boolean;
  deactivatedAt: string | null;
  updatedAt: string;
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pageSize: number;
}

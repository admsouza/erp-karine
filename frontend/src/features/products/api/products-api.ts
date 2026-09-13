import { http } from '../../../shared/api/http-client';
import type { Product, ProductPage } from '../types/product';

export const listProducts = async (
  input: {
    search?: string;
    active?: 'true' | 'false';
    page?: number;
    pageSize?: number;
  },
  signal?: AbortSignal,
) =>
  (await http.get<ProductPage>('/products', { params: input, signal })).data;

/** Produtos ativos — alimenta o seletor do lançamento manual. */
export const listProductOptions = async (signal?: AbortSignal) =>
  (await http.get<Product[]>('/products/options', { signal })).data;

export const createProduct = async (input: {
  name: string;
  description?: string;
  unit?: string;
  priceCents?: number;
}) => (await http.post<Product>('/products', input)).data;

export const updateProduct = async (
  id: string,
  input: {
    name?: string;
    description?: string;
    unit?: string;
    priceCents?: number;
  },
) => (await http.patch<Product>(`/products/${id}`, input)).data;

export const setProductActive = async (id: string, active: boolean) =>
  (
    await http.patch<Product>(
      `/products/${id}/${active ? 'reactivate' : 'inactivate'}`,
    )
  ).data;

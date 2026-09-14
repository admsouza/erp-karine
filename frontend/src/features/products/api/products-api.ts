import { http } from '../../../shared/api/http-client';
import type { Product, ProductCommercialUse, ProductPage } from '../types/product';
export const listProducts = async (input: { search?: string; active?: 'true' | 'false'; page?: number; pageSize?: number }, signal?: AbortSignal) => (await http.get<ProductPage>('/products', { params: input, signal })).data;
export const listProductOptions = async (type: 'RECEITA' | 'DESPESA', signal?: AbortSignal) => (await http.get<Product[]>('/products/options', { params: { type }, signal })).data;
type ProductInput = { name: string; description?: string; unit?: string; priceCents?: number; purchasePriceCents?: number; commercialUse: ProductCommercialUse };
export const createProduct = async (input: ProductInput) => (await http.post<Product>('/products', input)).data;
export const updateProduct = async (id: string, input: Partial<ProductInput>) => (await http.patch<Product>(`/products/${id}`, input)).data;
export const setProductActive = async (id: string, active: boolean) => (await http.patch<Product>(`/products/${id}/${active ? 'reactivate' : 'inactivate'}`)).data;

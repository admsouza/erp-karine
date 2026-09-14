import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository.js';
import { toProductEntity, type ProductEntity } from '../entities/product.entity.js';

/**
 * Contrato público do módulo `products`: financeiro (lançamento manual) e Manutenção de cadastros
 * consultam por aqui — nunca pelo repository.
 */
@Injectable()
export class ProductQueryService {
  constructor(private readonly repository: ProductRepository) {}

  async list(filters: { search?: string; active?: boolean; page?: number; pageSize?: number }) {
    const page = filters.page ?? 1;
    const pageSize = filters.pageSize ?? 20;
    const { items, total } = await this.repository.findPage({
      search: filters.search,
      active: filters.active,
      page,
      pageSize,
    });
    return { items: items.map(toProductEntity), total, page, pageSize };
  }

  async listActive(type?: 'RECEITA' | 'DESPESA'): Promise<ProductEntity[]> {
    return (await this.repository.findAll())
      .filter((x) => x.active && (!type || x.commercialUse === 'AMBOS' || (type === 'RECEITA' ? x.commercialUse === 'VENDA' : x.commercialUse === 'COMPRA')))
      .map(toProductEntity);
  }

  async findById(id: string): Promise<ProductEntity | null> {
    const model = await this.repository.findById(id);
    return model ? toProductEntity(model) : null;
  }

  async getById(id: string) {
    const produto = await this.findById(id);
    if (!produto) throw new NotFoundException('Produto não encontrado.');
    return produto;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.repository.findById(id)) !== null;
  }
}

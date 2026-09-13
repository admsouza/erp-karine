import { Injectable } from '@nestjs/common';
import type { Prisma, Product } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

/** Único ponto deste módulo que fala com o Prisma. Nenhuma regra de negócio aqui. */
@Injectable()
export class ProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProductCreateInput): Promise<Product> {
    return this.prisma.product.create({ data });
  }

  update(id: string, data: Prisma.ProductUpdateInput): Promise<Product> {
    return this.prisma.product.update({ where: { id }, data });
  }

  findById(id: string): Promise<Product | null> {
    return this.prisma.product.findUnique({ where: { id } });
  }

  findAll(): Promise<Product[]> {
    return this.prisma.product.findMany({ orderBy: { name: 'asc' } });
  }

  async findPage(params: { search?: string; active?: boolean; page: number; pageSize: number }) {
    const where: Prisma.ProductWhereInput = {
      ...(params.active === undefined ? {} : { active: params.active }),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }
}

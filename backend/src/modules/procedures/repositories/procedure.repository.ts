import { Injectable } from '@nestjs/common';
import type { Prisma, Procedure } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

/**
 * Único ponto deste módulo que fala com o Prisma. Nenhuma regra de negócio aqui.
 */
@Injectable()
export class ProcedureRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProcedureCreateInput): Promise<Procedure> {
    return this.prisma.procedure.create({ data });
  }

  update(id: string, data: Prisma.ProcedureUpdateInput): Promise<Procedure> {
    return this.prisma.procedure.update({ where: { id }, data });
  }

  findById(id: string): Promise<Procedure | null> {
    return this.prisma.procedure.findFirst({ where: { id, deletedAt: null } });
  }

  findByName(name: string): Promise<Procedure | null> {
    return this.prisma.procedure.findFirst({ where: { name, deletedAt: null } });
  }

  async findPage(params: {
    search?: string;
    active?: boolean;
    skip: number;
    take: number;
  }): Promise<{ items: Procedure[]; total: number }> {
    const where: Prisma.ProcedureWhereInput = { deletedAt: null };
    if (typeof params.active === 'boolean') where.active = params.active;
    if (params.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.procedure.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.procedure.count({ where }),
    ]);

    return { items, total };
  }
}

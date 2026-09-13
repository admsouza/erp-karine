import { Injectable } from '@nestjs/common';
import type { Client, Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

interface FindPageParams {
  search?: string;
  active?: boolean;
  skip: number;
  take: number;
}

/**
 * Único ponto do módulo de clientes que fala com o banco.
 * Nenhuma regra de negócio aqui — apenas consulta e persistência.
 */
@Injectable()
export class ClientRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ClientCreateInput): Promise<Client> {
    return this.prisma.client.create({ data });
  }

  update(id: string, data: Prisma.ClientUpdateInput): Promise<Client> {
    return this.prisma.client.update({ where: { id }, data });
  }

  findById(id: string): Promise<Client | null> {
    return this.prisma.client.findFirst({ where: { id, deletedAt: null } });
  }

  findByCpf(cpf: string): Promise<Client | null> {
    return this.prisma.client.findFirst({ where: { cpf, deletedAt: null } });
  }

  async findPage(params: FindPageParams): Promise<{ items: Client[]; total: number }> {
    const where = this.buildWhere(params);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({
        where,
        orderBy: { fullName: 'asc' },
        skip: params.skip,
        take: params.take,
      }),
      this.prisma.client.count({ where }),
    ]);

    return { items, total };
  }

  private buildWhere(params: FindPageParams): Prisma.ClientWhereInput {
    const where: Prisma.ClientWhereInput = { deletedAt: null };

    if (typeof params.active === 'boolean') {
      where.active = params.active;
    }

    const term = params.search?.trim();
    if (term) {
      const digits = term.replace(/\D/g, '');
      where.OR = [
        { fullName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term } },
        { whatsapp: { contains: term } },
        ...(digits.length >= 3 ? [{ cpf: { contains: digits } }] : []),
      ];
    }

    return where;
  }
}

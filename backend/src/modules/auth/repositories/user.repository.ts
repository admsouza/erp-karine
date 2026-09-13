import { Injectable } from '@nestjs/common';
import type { Prisma, User } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

/** Único ponto do módulo `auth` que fala com o Prisma na tabela `User`. */
@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async count(): Promise<number> {
    return this.prisma.user.count();
  }

  /** Administradores ativos — usado para não deixar o sistema sem ninguém com acesso total. */
  countActiveAdmins(): Promise<number> {
    return this.prisma.user.count({ where: { role: 'ADMIN', active: true } });
  }

  /** Listagem administrativa com busca por nome/e-mail e filtros de perfil e situação. */
  async findManyWithFilters(filtros: { search?: string; role?: 'ADMIN' | 'USER'; active?: boolean; page: number; pageSize: number }) {
    const where: Prisma.UserWhereInput = {
      role: filtros.role,
      active: filtros.active,
      ...(filtros.search
        ? {
            OR: [
              { name: { contains: filtros.search, mode: 'insensitive' as const } },
              { email: { contains: filtros.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: [{ active: 'desc' }, { name: 'asc' }],
        skip: (filtros.page - 1) * filtros.pageSize,
        take: filtros.pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);
    return { items, total, page: filtros.page, pageSize: filtros.pageSize };
  }
}

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

/** Filtros já normalizados (datas resolvidas) pela camada de serviço. */
export interface AuditSearchFilters {
  actorUserId?: string;
  module?: string;
  entityType?: string;
  action?: string;
  createdAt?: { gte?: Date; lte?: Date };
  search?: string;
  page: number;
  pageSize: number;
}

@Injectable()
export class AuditEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AuditEventUncheckedCreateInput, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).auditEvent.create({ data });
  }

  async list(entityType: string, entityId: string, page: number, pageSize: number) {
    const where = { entityType, entityId };
    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.auditEvent.count({ where }),
    ]);
    return { items, total, page, pageSize };
  }

  async search(filters: AuditSearchFilters) {
    const where: Prisma.AuditEventWhereInput = {
      actorUserId: filters.actorUserId,
      module: filters.module,
      entityType: filters.entityType,
      action: filters.action,
      createdAt: filters.createdAt,
      ...(filters.search
        ? {
            OR: [
              { reason: { contains: filters.search, mode: 'insensitive' as const } },
              { actorName: { contains: filters.search, mode: 'insensitive' as const } },
              { actorEmail: { contains: filters.search, mode: 'insensitive' as const } },
              { entityId: { contains: filters.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.auditEvent.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (filters.page - 1) * filters.pageSize,
        take: filters.pageSize,
      }),
      this.prisma.auditEvent.count({ where }),
    ]);

    return { items, total, page: filters.page, pageSize: filters.pageSize };
  }

  /** Opções para os filtros da tela (autores, módulos, tipos e ações já registrados). */
  async options() {
    const [autores, modulos, tipos, acoes] = await Promise.all([
      this.prisma.auditEvent.findMany({
        distinct: ['actorUserId'],
        select: { actorUserId: true, actorName: true, actorEmail: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditEvent.findMany({ distinct: ['module'], select: { module: true }, orderBy: { module: 'asc' } }),
      this.prisma.auditEvent.findMany({ distinct: ['entityType'], select: { entityType: true }, orderBy: { entityType: 'asc' } }),
      this.prisma.auditEvent.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } }),
    ]);

    return {
      actors: autores.map((item) => ({ id: item.actorUserId, name: item.actorName, email: item.actorEmail })),
      modules: modulos.map((item) => item.module),
      entityTypes: tipos.map((item) => item.entityType),
      actions: acoes.map((item) => item.action),
    };
  }
}

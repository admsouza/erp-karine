import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
@Injectable()
export class AuditEventRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(data: Prisma.AuditEventUncheckedCreateInput, tx?: Prisma.TransactionClient) { return (tx ?? this.prisma).auditEvent.create({ data }); }
  async list(entityType: string, entityId: string, page: number, pageSize: number) { const where = { entityType, entityId }; const [items,total]=await Promise.all([this.prisma.auditEvent.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*pageSize,take:pageSize}),this.prisma.auditEvent.count({where})]); return {items,total,page,pageSize}; }
}
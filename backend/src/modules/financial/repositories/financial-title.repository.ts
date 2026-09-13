import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
import { CashRepository } from './cash.repository.js';
import type { ListFinancialTitlesDto } from '../dto/financial-title.dto.js';
@Injectable()
export class FinancialTitleRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cash: CashRepository,
  ) {}
  transaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.cash.transaction(work);
  }
  create(data: Prisma.FinancialTitleCreateInput, tx: Prisma.TransactionClient) {
    return tx.financialTitle.create({ data });
  }
  find(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).financialTitle.findUnique({
      where: { id },
      include: { settlements: { orderBy: { createdAt: 'asc' } } },
    });
  }
  list(q: ListFinancialTitlesDto) {
    return this.prisma.financialTitle.findMany({
      where: { type: q.type },
      include: { settlements: true },
      orderBy: [{ dueDate: 'asc' }, { id: 'asc' }],
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    });
  }
  count(q: ListFinancialTitlesDto) {
    return this.prisma.financialTitle.count({ where: { type: q.type } });
  }
  cancel(id: string, tx: Prisma.TransactionClient) {
    return tx.financialTitle.update({
      where: { id },
      data: { cancelledAt: new Date() },
    });
  }
  settlementByKey(idempotencyKey: string, tx: Prisma.TransactionClient) {
    return tx.financialSettlement.findUnique({ where: { idempotencyKey } });
  }
  createSettlement(
    data: Prisma.FinancialSettlementUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.financialSettlement.create({ data });
  }
}

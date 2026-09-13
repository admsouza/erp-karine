import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
@Injectable()
export class ReconciliationRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(
    data: Prisma.FinancialReconciliationCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.financialReconciliation.create({ data });
  }
  list(periodId: string) {
    return this.prisma.financialReconciliation.findMany({
      where: { periodId },
      orderBy: { createdAt: 'desc' },
    });
  }
}

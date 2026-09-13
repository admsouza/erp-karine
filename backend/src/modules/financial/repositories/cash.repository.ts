import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
@Injectable()
export class CashRepository {
  constructor(private readonly prisma: PrismaService) {}
  async lock(tx: Prisma.TransactionClient) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(73194021)::text`;
  }
  transaction<T>(
    work: (tx: Prisma.TransactionClient) => Promise<T>,
    existing?: Prisma.TransactionClient,
  ) {
    if (existing) return this.lock(existing).then(() => work(existing));
    return this.prisma.$transaction(
      async (tx) => {
        await this.lock(tx);
        return work(tx);
      },
      { timeout: 15000 },
    );
  }
  periods(tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).cashPeriod.findMany({
      include: { balances: { include: { account: true } } },
      orderBy: { month: 'desc' },
    });
  }
  period(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).cashPeriod.findUnique({
      where: { id },
      include: { balances: { include: { account: true } } },
    });
  }
  accounts(tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).resourceAccount.findMany({
      orderBy: { name: 'asc' },
    });
  }
  createAccount(
    data: Prisma.ResourceAccountCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.resourceAccount.create({ data });
  }
  account(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).resourceAccount.findUnique({ where: { id } });
  }
  updateAccount(
    id: string,
    data: Prisma.ResourceAccountUpdateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.resourceAccount.update({ where: { id }, data });
  }
  deleteBalances(
    periodId: string,
    accountId: string,
    tx: Prisma.TransactionClient,
  ) {
    return tx.cashBalance.deleteMany({ where: { periodId, accountId } });
  }
  suggestions(tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).resourceAccountSuggestion.findMany({
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });
  }
  suggestion(id: string, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).resourceAccountSuggestion.findUnique({
      where: { id },
    });
  }
  createSuggestion(
    data: Prisma.ResourceAccountSuggestionCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.resourceAccountSuggestion.create({ data });
  }
  updateSuggestion(
    id: string,
    data: Prisma.ResourceAccountSuggestionUpdateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.resourceAccountSuggestion.update({ where: { id }, data });
  }
  createPeriod(
    data: Prisma.CashPeriodCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.cashPeriod.create({ data });
  }
  createBalance(
    data: Prisma.CashBalanceUncheckedCreateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.cashBalance.create({ data });
  }
  updateBalance(
    id: string,
    data: Prisma.CashBalanceUpdateInput,
    tx: Prisma.TransactionClient,
  ) {
    return tx.cashBalance.update({ where: { id }, data });
  }
  closePeriod(id: string, tx: Prisma.TransactionClient) {
    return tx.cashPeriod.update({
      where: { id },
      data: { closedAt: new Date() },
    });
  }
  movements(from: Date, to: Date, tx?: Prisma.TransactionClient) {
    return (tx ?? this.prisma).financialTransaction.findMany({
      where: { date: { gte: from, lt: to }, status: 'PAGO' },
    });
  }
}

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
import type { FinancialFilters } from '../services/financial-query.service.js';
@Injectable()
export class FinancialTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}
  counterparties() {
    return this.prisma.financialTransaction
      .findMany({
        where: { counterparty: { not: null } },
        distinct: ['counterparty'],
        select: { counterparty: true },
        orderBy: { counterparty: 'asc' },
        take: 200,
      })
      .then((linhas) => linhas.map((x) => x.counterparty as string));
  }

  create(data: Prisma.FinancialTransactionUncheckedCreateInput, tx?: Prisma.TransactionClient) { return (tx ?? this.prisma).financialTransaction.create({ data }); }
  findByKey(idempotencyKey:string,tx:Prisma.TransactionClient){return tx.financialTransaction.findUnique({where:{idempotencyKey}});}
  settlementFor(transactionId:string,tx:Prisma.TransactionClient){return tx.financialSettlement.findUnique({where:{transactionId}});}
  findById(id: string, tx?: Prisma.TransactionClient) { return (tx ?? this.prisma).financialTransaction.findUnique({ where: { id } }); }
  findByAppointmentId(appointmentId: string,tx?:Prisma.TransactionClient) { return (tx??this.prisma).financialTransaction.findUnique({ where: { appointmentId } }); }
  findBySubscriptionPaymentId(subscriptionPaymentId: string, tx?: Prisma.TransactionClient) { return (tx ?? this.prisma).financialTransaction.findUnique({ where: { subscriptionPaymentId } }); }
  update(id: string, data: Prisma.FinancialTransactionUncheckedUpdateInput, tx?: Prisma.TransactionClient) { return (tx ?? this.prisma).financialTransaction.update({ where: { id }, data }); }
  updateWithTransaction(id: string, data: Prisma.FinancialTransactionUncheckedUpdateInput, tx: Prisma.TransactionClient) { return tx.financialTransaction.update({ where: { id }, data }); }
  findMany(filters: FinancialFilters) { return this.prisma.financialTransaction.findMany({ where: { date: filters.from || filters.to ? { gte: filters.from, lt: filters.to } : undefined, clientId: filters.clientId, origin: filters.origin, type: filters.type, status: filters.status }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }); }
}

import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
import type { FinancialFilters } from '../services/financial-query.service.js';
@Injectable()
export class FinancialTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}
  create(data: Prisma.FinancialTransactionUncheckedCreateInput) { return this.prisma.financialTransaction.create({ data }); }
  findById(id: string) { return this.prisma.financialTransaction.findUnique({ where: { id } }); }
  findByAppointmentId(appointmentId: string) { return this.prisma.financialTransaction.findUnique({ where: { appointmentId } }); }
  findBySubscriptionPaymentId(subscriptionPaymentId: string) { return this.prisma.financialTransaction.findUnique({ where: { subscriptionPaymentId } }); }
  update(id: string, data: Prisma.FinancialTransactionUncheckedUpdateInput) { return this.prisma.financialTransaction.update({ where: { id }, data }); }
  findMany(filters: FinancialFilters) { return this.prisma.financialTransaction.findMany({ where: { date: filters.from || filters.to ? { gte: filters.from, lt: filters.to } : undefined, clientId: filters.clientId, origin: filters.origin, type: filters.type, status: filters.status }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] }); }
}

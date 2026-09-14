import { Injectable } from '@nestjs/common';
import type { FinancialStatus, FinancialTransactionType, TransactionOrigin } from '../../../generated/prisma/client.js';
import { toFinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import { FinancialTransactionRepository } from '../repositories/financial-transaction.repository.js';
export interface FinancialFilters { from?: Date; to?: Date; clientId?: string; origin?: TransactionOrigin; type?: FinancialTransactionType; status?: FinancialStatus }
@Injectable()
export class FinancialQueryService {
  constructor(private readonly repository: FinancialTransactionRepository) {}
  async list(filters: FinancialFilters) { return (await this.repository.findMany(filters)).map(toFinancialTransactionEntity); }
  listCounterparties() { return this.repository.counterparties(); }
  async summary(filters: Pick<FinancialFilters, 'from'|'to'|'clientId'>) {
    const items = await this.repository.findMany(filters); const paid = items.filter((item) => item.status === 'PAGO');
    const revenueCents = paid.filter((item) => item.type === 'RECEITA').reduce((sum, item) => sum + item.amountCents, 0);
    const expenseCents = paid.filter((item) => item.type === 'DESPESA').reduce((sum, item) => sum + item.amountCents, 0);
    return { revenueCents, expenseCents, balanceCents: revenueCents - expenseCents, receiptCount: paid.filter((item) => item.type === 'RECEITA').length };
  }
  async reports(filters: Pick<FinancialFilters, 'from'|'to'|'clientId'>) {
    const paid = (await this.repository.findMany(filters)).filter((item) => item.status === 'PAGO' && item.type === 'RECEITA');
    const group = (key: 'procedureName'|'subscriptionName') => Array.from(paid.reduce((map, item) => { const name = item[key]; if (name) map.set(name, (map.get(name) ?? 0) + item.amountCents); return map; }, new Map<string, number>())).map(([name, amountCents]) => ({ name, amountCents })).sort((a,b) => b.amountCents-a.amountCents);
    const products = new Map<string, { revenueCents: number; costCents: number; unknownCostCount: number }>();
    for (const item of paid) if (item.productName) { const value = products.get(item.productName) ?? { revenueCents: 0, costCents: 0, unknownCostCount: 0 }; value.revenueCents += item.amountCents; if (item.productCostCents === null) value.unknownCostCount++; else value.costCents += item.productCostCents; products.set(item.productName, value); }
    const byProduct = Array.from(products, ([name, value]) => ({ name, ...value, profitCents: value.revenueCents - value.costCents })).sort((a,b) => b.profitCents - a.profitCents);
    return { byProcedure: group('procedureName'), bySubscription: group('subscriptionName'), byProduct };
  }
}

import type { FinancialTransaction } from '../../../generated/prisma/client.js';
export const toFinancialTransactionEntity = (model: FinancialTransaction) => ({ ...model });

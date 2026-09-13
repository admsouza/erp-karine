import type { PaymentMethod, TransactionType } from './financial';
export interface FinancialSettlement {
  id: string;
  amountCents: number;
  date: string;
  resourceAccountId: string;
  transactionId: string;
  paymentMethod: PaymentMethod;
}
export interface FinancialTitle {
  id: string;
  type: TransactionType;
  description: string;
  counterparty: string | null;
  dueDate: string;
  amountCents: number;
  paidCents: number;
  remainingCents: number;
  status: 'PENDENTE' | 'PARCIAL' | 'PAGO' | 'CANCELADO';
  overdue: boolean;
  settlements: FinancialSettlement[];
}

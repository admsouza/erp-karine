import { http } from '../../../shared/api/http-client';
import type { FinancialTitle } from '../types/title';
import type { PaymentMethod, TransactionType } from '../types/financial';
export const listFinancialTitles = async (
  type: TransactionType,
  page: number,
) =>
  (
    await http.get<{
      items: FinancialTitle[];
      total: number;
      page: number;
      pageSize: number;
    }>('/financial/titles', { params: { type, page, pageSize: 20 } })
  ).data;
export const createFinancialTitle = async (input: {
  type: TransactionType;
  description: string;
  counterparty?: string;
  dueDate: string;
  amountCents: number;
}) => (await http.post('/financial/titles', input)).data;
export const settleFinancialTitle = async (
  id: string,
  input: {
    amountCents: number;
    date: string;
    resourceAccountId: string;
    paymentMethod: PaymentMethod;
    idempotencyKey: string;
  },
) => (await http.post(`/financial/titles/${id}/settlements`, input)).data;
export const cancelFinancialTitle = async (id: string, reason: string) =>
  (await http.patch(`/financial/titles/${id}/cancel`, { reason })).data;

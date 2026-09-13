import { http } from '../../../shared/api/http-client';
import type { CashPeriod, ResourceAccount } from '../types/cash';
export const listResourceAccounts = async () =>
  (await http.get<ResourceAccount[]>('/financial/accounts')).data;
export const createResourceAccount = async (input: {
  name: string;
  kind: string;
}) => (await http.post<ResourceAccount>('/financial/accounts', input)).data;
export const listCashPeriods = async () =>
  (await http.get<CashPeriod[]>('/financial/cash-periods')).data;
export const getCashPeriod = async (id: string) =>
  (await http.get<CashPeriod>(`/financial/cash-periods/${id}`)).data;
export const openCashPeriod = async (input: {
  month: string;
  initialBalances?: { accountId: string; amountCents: number }[];
}) => (await http.post<CashPeriod>('/financial/cash-periods', input)).data;
export const closeCashPeriod = async (
  id: string,
  input: {
    balances: { accountId: string; amountCents: number }[];
    reason: string;
  },
) => (await http.post(`/financial/cash-periods/${id}/close`, input)).data;
export const createReconciliation = async (input: {
  periodId: string;
  accountId: string;
  amountCents: number;
  reason: string;
}) => (await http.post('/financial/reconciliations', input)).data;
export const listReconciliations = async (id: string) =>
  (
    await http.get<import('../types/cash').FinancialReconciliation[]>(
      `/financial/cash-periods/${id}/reconciliations`,
    )
  ).data;

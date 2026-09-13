export interface ResourceAccount {
  id: string;
  name: string;
  kind: 'CASH' | 'BANK' | 'CARD';
  active: boolean;
}
export interface CashBalance {
  accountId: string;
  account: ResourceAccount;
  openingCents: number;
  incomingCents: number;
  outgoingCents: number;
  expectedCents: number;
  countedCents: number | null;
  differenceCents: number | null;
}
export interface CashPeriod {
  id: string;
  month: string;
  closedAt: string | null;
  balances: CashBalance[];
  unassignedCount?: number;
}
export const RESOURCE_KINDS = {
  CASH: 'Espécie',
  BANK: 'Banco',
  CARD: 'Conta de maquineta',
};
export interface FinancialReconciliation {
  id: string;
  periodId: string;
  accountId: string;
  expectedCents: number;
  countedCents: number;
  differenceCents: number;
  reason: string;
  createdAt: string;
}

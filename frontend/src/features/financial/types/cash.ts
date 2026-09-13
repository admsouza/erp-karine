export interface ResourceAccount {
  id: string;
  name: string;
  kind: 'CASH' | 'BANK' | 'CARD';
  active: boolean;
  deactivatedAt: string | null;
}
/** Local inativado sai das listas de escolha, mas o histórico dos meses fechados continua. */
export const locaisAtivos = (locais: ResourceAccount[]) =>
  locais.filter((x) => x.active);
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
export interface CashTotals {
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
  /** Saldo consolidado: a soma de todos os locais (o saldo é um só). */
  totals: CashTotals;
  unassignedCount?: number;
}
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

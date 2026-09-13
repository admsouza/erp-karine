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
/** Valor do seletor que libera o campo de nome próprio (mais de um banco/maquineta). */
export const OUTRO_LOCAL = '__outro__';
/** Sugestões de identificação por tipo — a clínica com um local de cada usa a primeira. */
export const RESOURCE_KIND_SUGGESTIONS: Record<
  keyof typeof RESOURCE_KINDS,
  string[]
> = {
  CASH: ['Dinheiro (gaveta)'],
  BANK: ['Banco principal', 'Banco secundário'],
  CARD: ['Maquineta principal', 'Maquineta 2'],
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

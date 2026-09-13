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
export const RESOURCE_KINDS = {
  CASH: 'Espécie',
  BANK: 'Banco',
  CARD: 'Conta de maquineta',
};
/** Valor do seletor que libera o campo de nome próprio (mais de um banco/maquineta). */
export const OUTRO_LOCAL = '__outro__';
/**
 * Identificações sugeridas de local, com o tipo junto. A lista é única (sem passo
 * intermediário): o tipo é derivado da escolha e continua editável para o caso
 * "Outro (digitar)". Ordem prática: espécie, bancos, maquinetas.
 */
export const IDENTIFICACOES_LOCAL: {
  name: string;
  kind: keyof typeof RESOURCE_KINDS;
}[] = [
  { name: 'Dinheiro (gaveta)', kind: 'CASH' },
  { name: 'Banco do Brasil', kind: 'BANK' },
  { name: 'Caixa Econômica', kind: 'BANK' },
  { name: 'Itaú', kind: 'BANK' },
  { name: 'Nubank', kind: 'BANK' },
  { name: 'Santander', kind: 'BANK' },
  { name: 'Mercado Pago', kind: 'BANK' },
  { name: 'Maquineta principal', kind: 'CARD' },
  { name: 'Maquineta 2', kind: 'CARD' },
];
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

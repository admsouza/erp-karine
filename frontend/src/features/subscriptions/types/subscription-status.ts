import type { PaymentMethod } from '../../financial/types/payment-method';

/** Espelha o enum SubscriptionStatus do schema Prisma. */
export const SUBSCRIPTION_STATUS = {
  ATIVA: 'ATIVA',
  CANCELADA: 'CANCELADA',
  ENCERRADA: 'ENCERRADA',
  INADIMPLENTE: 'INADIMPLENTE',
} as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const PERIODICITY = {
  MENSAL: 'MENSAL',
  BIMESTRAL: 'BIMESTRAL',
  TRIMESTRAL: 'TRIMESTRAL',
  SEMESTRAL: 'SEMESTRAL',
  ANUAL: 'ANUAL',
} as const;

export type Periodicity = (typeof PERIODICITY)[keyof typeof PERIODICITY];

export type { PaymentMethod };

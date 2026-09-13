/** Espelha o enum TransactionOrigin do schema Prisma. */
export const TRANSACTION_ORIGIN = {
  APPOINTMENT: 'APPOINTMENT',
  SUBSCRIPTION: 'SUBSCRIPTION',
  MANUAL: 'MANUAL',
} as const;

export type TransactionOrigin = (typeof TRANSACTION_ORIGIN)[keyof typeof TRANSACTION_ORIGIN];

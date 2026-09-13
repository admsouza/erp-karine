/**
 * Tipos compartilhados do frontend.
 * Os status espelham os enums do Prisma (backend/prisma/schema.prisma).
 * Usamos const objects + union types porque o projeto está com
 * `erasableSyntaxOnly` (enums TS não são permitidos).
 */

export const APPOINTMENT_STATUS = {
  AGENDADO: 'AGENDADO',
  CONFIRMADO: 'CONFIRMADO',
  REALIZADO: 'REALIZADO',
  CANCELADO: 'CANCELADO',
  FALTOU: 'FALTOU',
} as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

export const SUBSCRIPTION_STATUS = {
  ATIVA: 'ATIVA',
  CANCELADA: 'CANCELADA',
  ENCERRADA: 'ENCERRADA',
  INADIMPLENTE: 'INADIMPLENTE',
} as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS];

export const PAYMENT_METHOD = {
  PIX: 'PIX',
  DINHEIRO: 'DINHEIRO',
  CARTAO_CREDITO: 'CARTAO_CREDITO',
  CARTAO_DEBITO: 'CARTAO_DEBITO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  OUTRO: 'OUTRO',
} as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[keyof typeof PAYMENT_METHOD];

export const TRANSACTION_ORIGIN = {
  ATENDIMENTO: 'ATENDIMENTO',
  ASSINATURA: 'ASSINATURA',
  MANUAL: 'MANUAL',
} as const;
export type TransactionOrigin = (typeof TRANSACTION_ORIGIN)[keyof typeof TRANSACTION_ORIGIN];

export const EXAM_STATUS = {
  RECOMENDADO: 'RECOMENDADO',
  REALIZADO: 'REALIZADO',
  CANCELADO: 'CANCELADO',
} as const;
export type ExamStatus = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];

export interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  database: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}

/** Envelope padrão de erro devolvido pela API. */
export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

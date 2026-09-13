/**
 * Espelha o enum AppointmentStatus do schema Prisma.
 * const object + union type (o tsconfig usa `erasableSyntaxOnly`, sem enum TS).
 */
export const APPOINTMENT_STATUS = {
  AGENDADO: 'AGENDADO',
  CONFIRMADO: 'CONFIRMADO',
  REALIZADO: 'REALIZADO',
  CANCELADO: 'CANCELADO',
  FALTOU: 'FALTOU',
} as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[keyof typeof APPOINTMENT_STATUS];

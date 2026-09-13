/** Espelha o enum ExamStatus do schema Prisma. */
export const EXAM_STATUS = {
  RECOMENDADO: 'RECOMENDADO',
  REALIZADO: 'REALIZADO',
  CANCELADO: 'CANCELADO',
} as const;

export type ExamStatus = (typeof EXAM_STATUS)[keyof typeof EXAM_STATUS];

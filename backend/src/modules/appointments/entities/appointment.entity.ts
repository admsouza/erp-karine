import type { Appointment, AppointmentStatus, ProcedureUnit } from '../../../generated/prisma/client.js';

export interface AppointmentEntity {
  id: string;
  clientId: string;
  procedureId: string | null;
  professional: string | null;
  scheduledAt: Date;
  status: AppointmentStatus;
  notes: string | null;
  procedureName: string | null;
  procedureUnit: ProcedureUnit | null;
  quantity: number;
  unitValueCents: number;
  valueCents: number;
  createdAt: Date;
  updatedAt: Date;
}

export function toAppointmentEntity(model: Appointment): AppointmentEntity {
  return { ...model };
}

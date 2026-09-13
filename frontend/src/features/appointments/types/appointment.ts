import type { AppointmentStatus } from './appointment-status';
export type ProcedureUnit = 'SESSAO' | 'APLICACAO' | 'REGIAO' | 'ML' | 'UNIDADE' | 'HORA' | 'PACOTE';

export interface Appointment {
  id: string; clientId: string; clientName: string; procedureId: string | null;
  procedureName: string | null; procedureUnit: ProcedureUnit | null; professional: string | null;
  scheduledAt: string; status: AppointmentStatus; notes: string | null;
  quantity: number; unitValueCents: number; valueCents: number;
}

export interface AppointmentInput {
  clientId: string; procedureId: string; scheduledAt: string; quantity: number;
  professional?: string; notes?: string;
}

export interface AppointmentOption { id: string; name: string; active: boolean; currentValueCents?: number | null; unit?: ProcedureUnit; }

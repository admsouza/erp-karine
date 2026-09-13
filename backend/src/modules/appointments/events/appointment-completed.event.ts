import type { DomainEvent } from '../../../common/events/domain-event-bus.js';

export interface AppointmentCompleted extends DomainEvent {
  name: 'AppointmentCompleted';
  appointmentId: string;
  clientId: string;
  procedureId: string | null;
  procedureName: string | null;
  valueCents: number;
  completedAt: Date;
}

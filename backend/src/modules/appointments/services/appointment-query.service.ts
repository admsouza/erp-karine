import { Injectable, NotFoundException } from '@nestjs/common';
import type { AppointmentStatus } from '../../../generated/prisma/client.js';
import { ClientQueryService } from '../../clients/services/client-query.service.js';
import { toAppointmentEntity } from '../entities/appointment.entity.js';
import { AppointmentRepository } from '../repositories/appointment.repository.js';

export interface AppointmentFilters {
  from?: Date;
  to?: Date;
  clientId?: string;
  status?: AppointmentStatus;
}

function clinicDayStart(date: string): Date {
  return new Date(`${date}T00:00:00-03:00`);
}

function nextClinicDay(date: string, days = 1): Date {
  const start = clinicDayStart(date);
  start.setUTCDate(start.getUTCDate() + days);
  return start;
}

@Injectable()
export class AppointmentQueryService {
  constructor(private readonly appointments: AppointmentRepository, private readonly clients: ClientQueryService) {}

  private async withClientName(model: Awaited<ReturnType<AppointmentRepository['findById']>> & {}) {
    const entity = toAppointmentEntity(model);
    const client = await this.clients.getById(entity.clientId);
    return { ...entity, clientName: client.fullName };
  }

  async getById(id: string) {
    const model = await this.appointments.findById(id);
    if (!model) throw new NotFoundException('Agendamento não encontrado.');
    return this.withClientName(model);
  }

  async list(filters: AppointmentFilters) {
    return Promise.all((await this.appointments.findMany(filters)).map((model) => this.withClientName(model)));
  }

  daily(date: string) {
    return this.list({ from: clinicDayStart(date), to: nextClinicDay(date) });
  }

  weekly(date: string) {
    const selected = clinicDayStart(date);
    const weekday = selected.getUTCDay();
    const offset = weekday === 0 ? -6 : 1 - weekday;
    selected.setUTCDate(selected.getUTCDate() + offset);
    const end = new Date(selected);
    end.setUTCDate(end.getUTCDate() + 7);
    return this.list({ from: selected, to: end });
  }
}

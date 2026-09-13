import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AppointmentStatus } from '../../../generated/prisma/client.js';
import { DomainEventBus } from '../../../common/events/domain-event-bus.js';
import { ClientQueryService } from '../../clients/services/client-query.service.js';
import { ProcedureQueryService } from '../../procedures/services/procedure-query.service.js';
import type { CreateAppointmentDto } from '../dto/create-appointment.dto.js';
import type { UpdateAppointmentDto } from '../dto/update-appointment.dto.js';
import { toAppointmentEntity } from '../entities/appointment.entity.js';
import { AppointmentRepository } from '../repositories/appointment.repository.js';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly appointments: AppointmentRepository,
    private readonly clients: ClientQueryService,
    private readonly procedures: ProcedureQueryService,
    private readonly events?: DomainEventBus,
  ) {}

  async create(dto: CreateAppointmentDto) {
    const client = await this.clients.getById(dto.clientId);
    if (!client.active) throw new BadRequestException('Cliente inativo não pode ser agendado.');
    const procedure = await this.procedures.getById(dto.procedureId);
    if (!procedure.active) throw new BadRequestException('Procedimento inativo não pode ser agendado.');

    const scheduledAt = new Date(dto.scheduledAt);
    const unitValueCents = await this.procedures.valueOn(dto.procedureId, scheduledAt);
    if (unitValueCents === null) {
      throw new BadRequestException('Procedimento não possui valor vigente na data do atendimento.');
    }
    const quantity = dto.quantity ?? 1;
    const model = await this.appointments.create({
      clientId: dto.clientId,
      procedureId: dto.procedureId,
      scheduledAt,
      professional: dto.professional?.trim() || null,
      notes: dto.notes?.trim() || null,
      procedureName: procedure.name,
      procedureUnit: procedure.unit,
      quantity,
      unitValueCents,
      valueCents: unitValueCents * quantity,
    });
    return toAppointmentEntity(model);
  }

  async changeStatus(id: string, status: AppointmentStatus) {
    const appointment = await this.appointments.findById(id);
    if (!appointment) throw new NotFoundException('Agendamento não encontrado.');

    const allowed: Partial<Record<AppointmentStatus, AppointmentStatus[]>> = {
      AGENDADO: ['CONFIRMADO', 'CANCELADO', 'FALTOU'],
      CONFIRMADO: ['REALIZADO', 'CANCELADO', 'FALTOU'],
    };
    if (!allowed[appointment.status]?.includes(status)) {
      throw new ConflictException('Transição de status não permitida.');
    }

    if (status === 'REALIZADO' && this.events) {
      return toAppointmentEntity(await this.appointments.updateInTransaction(id,{status},async(updated,tx)=>{
        await this.events!.publish({ name: 'AppointmentCompleted', appointmentId: updated.id, clientId: updated.clientId, procedureId: updated.procedureId, procedureName: updated.procedureName, valueCents: updated.valueCents, completedAt: new Date() },tx);
      }));
    }
    return toAppointmentEntity(await this.appointments.update(id,{status}));
  }

  async update(id: string, dto: UpdateAppointmentDto) {
    const appointment = await this.appointments.findById(id);
    if (!appointment) throw new NotFoundException('Agendamento não encontrado.');
    if (appointment.status === 'REALIZADO' || appointment.status === 'CANCELADO' || appointment.status === 'FALTOU') {
      throw new ConflictException('Agendamento encerrado não pode ser alterado.');
    }
    return toAppointmentEntity(await this.appointments.update(id, {
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      professional: dto.professional === undefined ? undefined : dto.professional.trim() || null,
      notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
    }));
  }
}

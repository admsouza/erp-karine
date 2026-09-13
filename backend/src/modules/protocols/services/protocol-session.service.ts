import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AppointmentQueryService } from '../../appointments/services/appointment-query.service.js';
import { ProcedureQueryService } from '../../procedures/services/procedure-query.service.js';
import type { CreateProtocolSessionDto } from '../dto/create-protocol-session.dto.js';
import { ProtocolRepository } from '../repositories/protocol.repository.js';

const text = (value: string | undefined) => value === undefined ? undefined : value.trim() || null;

@Injectable()
export class ProtocolSessionService {
  constructor(
    private readonly protocols: ProtocolRepository,
    private readonly procedures: ProcedureQueryService,
    private readonly appointments: AppointmentQueryService,
  ) {}

  async add(protocolId: string, dto: CreateProtocolSessionDto) {
    const protocol = await this.protocols.findById(protocolId);
    if (!protocol) throw new NotFoundException('Protocolo não encontrado.');
    if (!protocol.active || protocol.status !== 'EM_ANDAMENTO') {
      throw new ConflictException('Sessões só podem ser acrescentadas a protocolo ativo e em andamento.');
    }

    let appointmentSnapshot: string | null = null;
    if (dto.appointmentId) {
      const appointment = await this.appointments.getById(dto.appointmentId);
      if (appointment.clientId !== protocol.clientId) throw new BadRequestException('Atendimento pertence a outro cliente.');
      if (appointment.status !== 'REALIZADO') throw new BadRequestException('Somente atendimento realizado pode ser vinculado.');
      if (await this.protocols.findSessionByAppointmentId(dto.appointmentId)) {
        throw new ConflictException('Atendimento já vinculado a uma sessão de protocolo.');
      }
      appointmentSnapshot = appointment.procedureName || 'Atendimento realizado';
    }

    const procedureName = dto.procedureId ? (await this.procedures.getById(dto.procedureId)).name : null;
    return this.protocols.createSession({
      protocolId, date: new Date(dto.date), procedureId: dto.procedureId, procedureName,
      appointmentId: dto.appointmentId, appointmentSnapshot,
      procedurePerformed: dto.procedurePerformed.trim(), professional: text(dto.professional),
      productsUsed: text(dto.productsUsed), parameters: text(dto.parameters), evolution: text(dto.evolution),
      guidelines: text(dto.guidelines), notes: text(dto.notes),
    });
  }
}

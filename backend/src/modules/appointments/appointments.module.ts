import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { ProceduresModule } from '../procedures/procedures.module.js';
import { AppointmentsController } from './controllers/appointments.controller.js';
import { AppointmentRepository } from './repositories/appointment.repository.js';
import { AppointmentQueryService } from './services/appointment-query.service.js';
import { AppointmentService } from './services/appointment.service.js';

/**
 * Módulo de Agendamentos.
 *
 * Contrato público, eventos e dependências permitidas: ver MODULES.md.
 * Implementação prevista para a Fase 4.
 */
@Module({
  imports: [ClientsModule, ProceduresModule],
  controllers: [AppointmentsController],
  providers: [AppointmentRepository, AppointmentService, AppointmentQueryService],
  exports: [AppointmentQueryService],
})
export class AppointmentsModule {}

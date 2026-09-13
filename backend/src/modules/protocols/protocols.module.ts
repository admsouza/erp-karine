import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { ClientsModule } from '../clients/clients.module.js';
import { ProceduresModule } from '../procedures/procedures.module.js';
import { ClientProtocolsController } from './controllers/client-protocols.controller.js';
import { ProtocolsController } from './controllers/protocols.controller.js';
import { ProtocolRepository } from './repositories/protocol.repository.js';
import { ProtocolQueryService } from './services/protocol-query.service.js';
import { ProtocolService } from './services/protocol.service.js';
import { ProtocolSessionService } from './services/protocol-session.service.js';

/**
 * Módulo de Protocolos.
 *
 * Contrato público, eventos e dependências permitidas: ver MODULES.md.
 * Implementação prevista para a Fase 7.
 */
@Module({
  imports: [ClientsModule, ProceduresModule, AppointmentsModule],
  controllers: [ProtocolsController, ClientProtocolsController],
  providers: [ProtocolRepository, ProtocolService, ProtocolSessionService, ProtocolQueryService],
  exports: [ProtocolQueryService],
})
export class ProtocolsModule {}

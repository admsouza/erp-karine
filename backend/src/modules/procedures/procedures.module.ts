import { Module } from '@nestjs/common';
import { ProceduresController } from './controllers/procedures.controller.js';
import { ProcedureService } from './services/procedure.service.js';
import { ProcedureQueryService } from './services/procedure-query.service.js';
import { ProcedureRepository } from './repositories/procedure.repository.js';

/**
 * Catálogo de procedimentos da clínica.
 *
 * Depende de: nada (usa `common/database`).
 * Não depende de: nenhum outro módulo de domínio.
 * Expõe: `ProcedureQueryService` — contrato público para agenda, protocolos e
 * financeiro referenciarem procedimentos **pelo id**.
 */
@Module({
  controllers: [ProceduresController],
  providers: [ProcedureRepository, ProcedureService, ProcedureQueryService],
  exports: [ProcedureQueryService],
})
export class ProceduresModule {}

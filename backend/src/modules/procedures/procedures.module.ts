import { Module } from '@nestjs/common';
import { ProceduresController } from './controllers/procedures.controller.js';
import { ProcedureService } from './services/procedure.service.js';
import { ProcedureQueryService } from './services/procedure-query.service.js';
import { ProcedurePriceService } from './services/procedure-price.service.js';
import { ProcedureRepository } from './repositories/procedure.repository.js';
import { ProcedurePriceRepository } from './repositories/procedure-price.repository.js';

/**
 * Catálogo de procedimentos da clínica, com série histórica de valores.
 *
 * Depende de: nada (usa `common/database`).
 * Não depende de: nenhum outro módulo de domínio.
 * Expõe: `ProcedureQueryService` — contrato público para agenda, protocolos e
 * financeiro, inclusive `valueOn(id, data)` para consultar o preço que valia
 * em um dia específico.
 */
@Module({
  controllers: [ProceduresController],
  providers: [
    ProcedureRepository,
    ProcedurePriceRepository,
    ProcedureService,
    ProcedureQueryService,
    ProcedurePriceService,
  ],
  exports: [ProcedureQueryService],
})
export class ProceduresModule {}

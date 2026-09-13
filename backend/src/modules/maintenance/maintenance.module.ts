import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ClientsModule } from '../clients/clients.module.js';
import { FinancialModule } from '../financial/financial.module.js';
import { ProceduresModule } from '../procedures/procedures.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { MaintenanceController } from './controllers/maintenance.controller.js';
import { MaintenanceService } from './services/maintenance.service.js';

/**
 * Hub de manutenção de cadastros (seção Sistema).
 *
 * Não tem tabela própria: consulta os contratos públicos de consulta e delega as operações
 * aos serviços públicos dos módulos donos (`clients`, `procedures`, `subscriptions`,
 * `financial`). Nenhum repository, controller ou arquivo interno de outro módulo é acessado.
 */
@Module({
  imports: [
    AuditModule,
    ClientsModule,
    ProceduresModule,
    SubscriptionsModule,
    FinancialModule,
  ],
  controllers: [MaintenanceController],
  providers: [MaintenanceService],
  exports: [MaintenanceService],
})
export class MaintenanceModule {}

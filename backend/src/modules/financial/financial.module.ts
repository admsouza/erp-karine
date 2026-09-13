import { ReconciliationRepository } from './repositories/reconciliation.repository.js';
import { ReconciliationService } from './services/reconciliation.service.js';
import { FinancialAdjustmentService } from './services/financial-adjustment.service.js';
import { FinancialTitleService } from './services/financial-title.service.js';
import { FinancialTitleRepository } from './repositories/financial-title.repository.js';
import { FinancialTitleController } from './controllers/financial-title.controller.js';
import { CashClosingService } from './services/cash-closing.service.js';
import { CashPolicyService } from './services/cash-policy.service.js';
import { AuditModule } from '../audit/audit.module.js';
import { CashRepository } from './repositories/cash.repository.js';
import { CashPeriodService } from './services/cash-period.service.js';
import { ResourceAccountService } from './services/resource-account.service.js';
import { CashController } from './controllers/cash.controller.js';
import { Module } from '@nestjs/common';
import { FinancialController } from './controllers/financial.controller.js';
import { FinancialTransactionRepository } from './repositories/financial-transaction.repository.js';
import { FinancialEventSubscriber } from './services/financial-event.subscriber.js';
import { FinancialQueryService } from './services/financial-query.service.js';
import { FinancialTransactionService } from './services/financial-transaction.service.js';
@Module({ imports: [AuditModule], controllers: [FinancialTitleController, CashController, FinancialController], providers: [ReconciliationRepository, ReconciliationService, FinancialAdjustmentService, FinancialTitleService, FinancialTitleRepository, CashClosingService, CashPolicyService, CashRepository, CashPeriodService, ResourceAccountService, FinancialTransactionRepository, FinancialTransactionService, FinancialQueryService, FinancialEventSubscriber], exports: [FinancialQueryService, FinancialTransactionService] })
export class FinancialModule {}

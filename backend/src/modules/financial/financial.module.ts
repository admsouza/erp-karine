import { Module } from '@nestjs/common';
import { FinancialController } from './controllers/financial.controller.js';
import { FinancialTransactionRepository } from './repositories/financial-transaction.repository.js';
import { FinancialEventSubscriber } from './services/financial-event.subscriber.js';
import { FinancialQueryService } from './services/financial-query.service.js';
import { FinancialTransactionService } from './services/financial-transaction.service.js';
@Module({ controllers: [FinancialController], providers: [FinancialTransactionRepository, FinancialTransactionService, FinancialQueryService, FinancialEventSubscriber], exports: [FinancialQueryService] })
export class FinancialModule {}

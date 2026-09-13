import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { SubscriptionPlansController, SubscriptionsController } from './controllers/subscriptions.controller.js';
import { SubscriptionPaymentRepository } from './repositories/subscription-payment.repository.js';
import { SubscriptionPlanRepository } from './repositories/subscription-plan.repository.js';
import { SubscriptionRepository } from './repositories/subscription.repository.js';
import { SubscriptionPaymentService } from './services/subscription-payment.service.js';
import { SubscriptionPlanQueryService } from './services/subscription-plan-query.service.js';
import { SubscriptionPlanService } from './services/subscription-plan.service.js';
import { SubscriptionQueryService } from './services/subscription-query.service.js';
import { SubscriptionService } from './services/subscription.service.js';
@Module({imports:[ClientsModule],controllers:[SubscriptionPlansController,SubscriptionsController],providers:[SubscriptionPlanRepository,SubscriptionRepository,SubscriptionPaymentRepository,SubscriptionPlanQueryService,SubscriptionPlanService,SubscriptionService,SubscriptionQueryService,SubscriptionPaymentService],exports:[SubscriptionQueryService]}) export class SubscriptionsModule {}

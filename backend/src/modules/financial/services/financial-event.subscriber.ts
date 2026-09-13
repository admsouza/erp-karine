import { Injectable, OnModuleInit } from '@nestjs/common';
import { DomainEventBus } from '../../../common/events/domain-event-bus.js';
import type { AppointmentCompleted } from '../../appointments/events/appointment-completed.event.js';
import type { SubscriptionPaymentReceived } from '../../subscriptions/events/subscription-payment-received.event.js';
import { FinancialTransactionService } from './financial-transaction.service.js';
@Injectable()
export class FinancialEventSubscriber implements OnModuleInit {
  constructor(private readonly events: DomainEventBus, private readonly transactions: FinancialTransactionService) {}
  onModuleInit() {
    this.events.subscribe<AppointmentCompleted>('AppointmentCompleted', async (event) => { await this.transactions.fromAppointment(event); });
    this.events.subscribe<SubscriptionPaymentReceived>('SubscriptionPaymentReceived', async (event) => { await this.transactions.fromSubscriptionPayment(event); });
  }
}

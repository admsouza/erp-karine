import type { PaymentMethod } from '../../../generated/prisma/client.js';
import type { DomainEvent } from '../../../common/events/domain-event-bus.js';

export interface SubscriptionPaymentReceived extends DomainEvent {
  name: 'SubscriptionPaymentReceived';
  subscriptionPaymentId: string;
  subscriptionId: string;
  clientId: string;
  subscriptionName: string;
  amountCents: number;
  paidAt: Date;
  paymentMethod: PaymentMethod;
}

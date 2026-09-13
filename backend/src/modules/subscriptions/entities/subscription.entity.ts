import type { ClientSubscription, SubscriptionPayment, SubscriptionPlan } from '../../../generated/prisma/client.js';
export const toPlanEntity = (model: SubscriptionPlan) => ({ ...model });
export const toSubscriptionEntity = (model: ClientSubscription) => ({ ...model });
export const toPaymentEntity = (model: SubscriptionPayment) => ({ ...model });

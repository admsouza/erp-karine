import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePaymentDto } from '../dto/subscription.dto.js';
import { toPaymentEntity } from '../entities/subscription.entity.js';
import { SubscriptionPaymentRepository } from '../repositories/subscription-payment.repository.js';
import { SubscriptionRepository } from '../repositories/subscription.repository.js';
import { DomainEventBus } from '../../../common/events/domain-event-bus.js';
@Injectable() export class SubscriptionPaymentService {
 constructor(private readonly payments:SubscriptionPaymentRepository,private readonly subscriptions:SubscriptionRepository,private readonly events?:DomainEventBus){}
 async create(subscriptionId:string,dto:CreatePaymentDto){const subscription=await this.subscriptions.findById(subscriptionId);if(!subscription)throw new NotFoundException('Assinatura não encontrada.');if(subscription.status==='CANCELADA'||subscription.status==='ENCERRADA')throw new ConflictException('Assinatura encerrada não aceita pagamento.');const payment=toPaymentEntity(await this.payments.create({subscriptionId,amountCents:dto.amountCents,paidAt:new Date(dto.paidAt),paymentMethod:dto.paymentMethod,notes:dto.notes||null}));if(this.events)await this.events.publish({name:'SubscriptionPaymentReceived',subscriptionPaymentId:payment.id,subscriptionId,clientId:subscription.clientId,subscriptionName:subscription.planName,amountCents:payment.amountCents,paidAt:payment.paidAt,paymentMethod:payment.paymentMethod});return payment;}
 async list(subscriptionId:string){if(!await this.subscriptions.findById(subscriptionId))throw new NotFoundException('Assinatura não encontrada.');return (await this.payments.findBySubscription(subscriptionId)).map(toPaymentEntity);}
}

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CreatePaymentDto } from '../dto/subscription.dto.js';
import { toPaymentEntity } from '../entities/subscription.entity.js';
import { SubscriptionPaymentRepository } from '../repositories/subscription-payment.repository.js';
import { SubscriptionRepository } from '../repositories/subscription.repository.js';
@Injectable() export class SubscriptionPaymentService {
 constructor(private readonly payments:SubscriptionPaymentRepository,private readonly subscriptions:SubscriptionRepository){}
 async create(subscriptionId:string,dto:CreatePaymentDto){const subscription=await this.subscriptions.findById(subscriptionId);if(!subscription)throw new NotFoundException('Assinatura não encontrada.');if(subscription.status==='CANCELADA'||subscription.status==='ENCERRADA')throw new ConflictException('Assinatura encerrada não aceita pagamento.');return toPaymentEntity(await this.payments.create({subscriptionId,amountCents:dto.amountCents,paidAt:new Date(dto.paidAt),paymentMethod:dto.paymentMethod,notes:dto.notes||null}));}
 async list(subscriptionId:string){if(!await this.subscriptions.findById(subscriptionId))throw new NotFoundException('Assinatura não encontrada.');return (await this.payments.findBySubscription(subscriptionId)).map(toPaymentEntity);}
}

import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditTrailService, type AuditChange } from '../../audit/services/audit-trail.service.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { FinancialTransactionService } from '../../financial/services/financial-transaction.service.js';
import { DomainEventBus } from '../../../common/events/domain-event-bus.js';
import type { CreatePaymentDto, UpdatePaymentDto } from '../dto/subscription.dto.js';
import { toPaymentEntity } from '../entities/subscription.entity.js';
import { SubscriptionPaymentRepository } from '../repositories/subscription-payment.repository.js';
import { SubscriptionRepository } from '../repositories/subscription.repository.js';

@Injectable()
export class SubscriptionPaymentService {
  constructor(private readonly payments:SubscriptionPaymentRepository,private readonly subscriptions:SubscriptionRepository,private readonly events?:DomainEventBus,private readonly financial?:FinancialTransactionService,private readonly audit?:AuditTrailService){}
  async create(subscriptionId:string,dto:CreatePaymentDto){const subscription=await this.subscriptions.findById(subscriptionId);if(!subscription)throw new NotFoundException('Assinatura não encontrada.');if(subscription.status==='CANCELADA'||subscription.status==='ENCERRADA')throw new ConflictException('Assinatura encerrada não aceita pagamento.');const data={subscriptionId,amountCents:dto.amountCents,paidAt:new Date(dto.paidAt),paymentMethod:dto.paymentMethod,notes:dto.notes||null};
    if(!this.events)return toPaymentEntity(await this.payments.create(data));
    return toPaymentEntity(await this.payments.createInTransaction(data,async(payment,tx)=>{await this.events!.publish({name:'SubscriptionPaymentReceived',subscriptionPaymentId:payment.id,subscriptionId,clientId:subscription.clientId,subscriptionName:subscription.planName,amountCents:payment.amountCents,paidAt:payment.paidAt,paymentMethod:payment.paymentMethod},tx);}));}

  async list(subscriptionId:string){if(!await this.subscriptions.findById(subscriptionId))throw new NotFoundException('Assinatura não encontrada.');return (await this.payments.findBySubscription(subscriptionId)).map(toPaymentEntity);}
  async get(id:string){const item=await this.payments.findById(id);if(!item)throw new NotFoundException('Pagamento não encontrado.');return toPaymentEntity(item);}
  async timeline(id:string,page=1,pageSize=20){await this.get(id);if(!this.audit)throw new Error('AuditTrailService indisponível.');return this.audit.timeline('SubscriptionPayment',id,page,pageSize);}
  async update(id:string,dto:UpdatePaymentDto,user:AuthenticatedUser,requestId?:string){
    const current=await this.payments.findById(id);if(!current)throw new NotFoundException('Pagamento não encontrado.');
    const next={amountCents:dto.amountCents,paidAt:new Date(dto.paidAt),paymentMethod:dto.paymentMethod,notes:dto.notes?.trim()||null};
    const changes:AuditChange[]=[];
    if(current.amountCents!==next.amountCents)changes.push({field:'amountCents',before:current.amountCents,after:next.amountCents});
    if(current.paidAt.getTime()!==next.paidAt.getTime())changes.push({field:'paidAt',before:current.paidAt.toISOString(),after:next.paidAt.toISOString()});
    if(current.paymentMethod!==next.paymentMethod)changes.push({field:'paymentMethod',before:current.paymentMethod,after:next.paymentMethod});
    if((current.notes??null)!==next.notes)changes.push({field:'notes',before:current.notes,after:next.notes});
    if(!changes.length)throw new BadRequestException('Nenhuma alteração efetiva foi informada.');
    if(!this.financial||!this.audit)throw new Error('Contratos de sincronização indisponíveis.');
    const updated=await this.payments.updateInTransaction(id,next,async(payment,tx)=>{
      await this.financial!.synchronizeSubscriptionPayment({subscriptionPaymentId:id,amountCents:payment.amountCents,paidAt:payment.paidAt,paymentMethod:payment.paymentMethod},tx);
      await this.audit!.record({actorUserId:user.id,actorName:user.name,actorEmail:user.email,module:'subscriptions',entityType:'SubscriptionPayment',entityId:id,action:'UPDATED',requestId,reason:dto.reason.trim(),changes},tx);
    });
    return toPaymentEntity(updated);
  }
}
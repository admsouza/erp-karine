import { CashRepository } from '../repositories/cash.repository.js';
import { CashPolicyService } from './cash-policy.service.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import type { AssignResourceDto } from '../dto/cash.dto.js';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AppointmentCompleted } from '../../appointments/events/appointment-completed.event.js';
import type { SubscriptionPaymentReceived } from '../../subscriptions/events/subscription-payment-received.event.js';
import type { CreateManualTransactionDto } from '../dto/financial.dto.js';
import { toFinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import { FinancialTransactionRepository } from '../repositories/financial-transaction.repository.js';
import type { PaymentMethod, Prisma } from '../../../generated/prisma/client.js';
@Injectable()
export class FinancialTransactionService {
  constructor(private readonly repository: FinancialTransactionRepository, private readonly cash: CashRepository, private readonly policy: CashPolicyService, private readonly audit: AuditTrailService) {}
  async createManual(dto: CreateManualTransactionDto, user?: AuthenticatedUser, requestId?: string) {
    return this.cash.transaction(async tx => {
      const date = new Date(dto.date.length===10 ? `${dto.date}T12:00:00-03:00` : dto.date);
      await this.policy.assertWritable(date,tx);
      if(dto.resourceAccountId)await this.policy.assertAccount(dto.resourceAccountId,tx);
      const item=await this.repository.create({ ...dto, description: dto.description.trim(), category: dto.category?.trim() || null, date, origin: 'MANUAL', clientId: dto.clientId ?? null, externalReference: dto.externalReference?.trim() || null, notes: dto.notes?.trim() || null },tx);
      if(user)await this.audit.record({actorUserId:user.id,actorName:user.name,actorEmail:user.email,module:'financial',entityType:'FinancialTransaction',entityId:item.id,action:'CREATED',requestId,changes:[{field:'amountCents',before:null,after:item.amountCents},{field:'resourceAccountId',before:null,after:item.resourceAccountId}]},tx);
      return toFinancialTransactionEntity(item);
    });
  }
  async fromAppointment(event: Omit<AppointmentCompleted, 'name'>,existingTx?:Prisma.TransactionClient) {
    return this.cash.transaction(async tx=>{
      const existing=await this.repository.findByAppointmentId(event.appointmentId,tx);if(existing)return toFinancialTransactionEntity(existing);
      await this.policy.assertWritable(event.completedAt,tx);
      return toFinancialTransactionEntity(await this.repository.create({ clientId: event.clientId, description: `Atendimento: ${event.procedureName ?? 'Procedimento'}`, category: 'Atendimento', amountCents: event.valueCents, date: event.completedAt, paymentMethod: 'OUTRO', origin: 'APPOINTMENT', type: 'RECEITA', status: 'PAGO', appointmentId: event.appointmentId, procedureId: event.procedureId, procedureName: event.procedureName },tx));
    },existingTx);
  }
  async fromSubscriptionPayment(event: Omit<SubscriptionPaymentReceived, 'name'>,existingTx?:Prisma.TransactionClient) {
    return this.cash.transaction(async tx=>{
      const existing=await this.repository.findBySubscriptionPaymentId(event.subscriptionPaymentId,tx);if(existing)return toFinancialTransactionEntity(existing);
      await this.policy.assertWritable(event.paidAt,tx);
      return toFinancialTransactionEntity(await this.repository.create({ clientId: event.clientId, description: `Assinatura: ${event.subscriptionName}`, category: 'Assinatura', amountCents: event.amountCents, date: event.paidAt, paymentMethod: event.paymentMethod, origin: 'SUBSCRIPTION', type: 'RECEITA', status: 'PAGO', subscriptionId: event.subscriptionId, subscriptionPaymentId: event.subscriptionPaymentId, subscriptionName: event.subscriptionName },tx));
    },existingTx);
  }
  async synchronizeSubscriptionPayment(event: { subscriptionPaymentId: string; amountCents: number; paidAt: Date; paymentMethod: PaymentMethod; description?: string }, tx: Prisma.TransactionClient) {
    await this.cash.lock(tx);
    const existing = await this.repository.findBySubscriptionPaymentId(event.subscriptionPaymentId, tx);
    if (!existing) throw new NotFoundException('Lançamento financeiro vinculado não encontrado.');
    await this.policy.assertWritable(existing.date,tx);
    await this.policy.assertWritable(event.paidAt,tx);
    return this.repository.updateWithTransaction(existing.id, { amountCents: event.amountCents, date: event.paidAt, paymentMethod: event.paymentMethod, description: event.description ?? existing.description }, tx);
  }
  async cancel(id: string, user?:AuthenticatedUser, requestId?:string) { return this.cash.transaction(async tx=>{ const item = await this.repository.findById(id,tx); if (!item) throw new NotFoundException('Lançamento financeiro não encontrado.'); if(await this.repository.settlementFor(id,tx))throw new ConflictException('Baixa de conta é imutável; registre ajuste auditado.'); if (item.status === 'CANCELADO') throw new ConflictException('Lançamento financeiro já está cancelado.'); await this.policy.assertWritable(item.date,tx); const updated=await this.repository.update(id, { status: 'CANCELADO', cancelledAt: new Date() },tx);if(user)await this.audit.record({actorUserId:user.id,actorName:user.name,actorEmail:user.email,module:'financial',entityType:'FinancialTransaction',entityId:id,action:'CANCELLED',requestId,changes:[{field:'status',before:item.status,after:'CANCELADO'}]},tx);return toFinancialTransactionEntity(updated); }); }
  async assign(id:string,dto:AssignResourceDto,user:AuthenticatedUser,requestId?:string){return this.cash.transaction(async tx=>{
    const item=await this.repository.findById(id,tx);if(!item)throw new NotFoundException('Lançamento não encontrado.');if(await this.repository.settlementFor(id,tx))throw new ConflictException('Baixa de conta é imutável; registre ajuste auditado.');await this.policy.assertWritable(item.date,tx);await this.policy.assertAccount(dto.resourceAccountId,tx);
    if(item.resourceAccountId===dto.resourceAccountId)throw new ConflictException('O lançamento já pertence a este local.');
    const updated=await this.repository.update(id,{resourceAccountId:dto.resourceAccountId},tx);
    await this.audit.record({actorUserId:user.id,actorName:user.name,actorEmail:user.email,module:'financial',entityType:'FinancialTransaction',entityId:id,action:'RESOURCE_ASSIGNED',reason:dto.reason,requestId,changes:[{field:'resourceAccountId',before:item.resourceAccountId,after:dto.resourceAccountId}]},tx);return updated;
  });}
}

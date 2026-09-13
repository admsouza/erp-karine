import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { AppointmentCompleted } from '../../appointments/events/appointment-completed.event.js';
import type { SubscriptionPaymentReceived } from '../../subscriptions/events/subscription-payment-received.event.js';
import type { CreateManualTransactionDto } from '../dto/financial.dto.js';
import { toFinancialTransactionEntity } from '../entities/financial-transaction.entity.js';
import { FinancialTransactionRepository } from '../repositories/financial-transaction.repository.js';
@Injectable()
export class FinancialTransactionService {
  constructor(private readonly repository: FinancialTransactionRepository) {}
  async createManual(dto: CreateManualTransactionDto) { return toFinancialTransactionEntity(await this.repository.create({ ...dto, description: dto.description.trim(), category: dto.category?.trim() || null, date: new Date(dto.date), origin: 'MANUAL', clientId: dto.clientId ?? null, externalReference: dto.externalReference?.trim() || null, notes: dto.notes?.trim() || null })); }
  async fromAppointment(event: Omit<AppointmentCompleted, 'name'>) {
    const existing = await this.repository.findByAppointmentId(event.appointmentId); if (existing) return toFinancialTransactionEntity(existing);
    try { return toFinancialTransactionEntity(await this.repository.create({ clientId: event.clientId, description: `Atendimento: ${event.procedureName ?? 'Procedimento'}`, category: 'Atendimento', amountCents: event.valueCents, date: event.completedAt, paymentMethod: 'OUTRO', origin: 'APPOINTMENT', type: 'RECEITA', status: 'PAGO', appointmentId: event.appointmentId, procedureId: event.procedureId, procedureName: event.procedureName })); } catch (error: unknown) { const concurrent = await this.repository.findByAppointmentId(event.appointmentId); if (concurrent) return toFinancialTransactionEntity(concurrent); throw error; }
  }
  async fromSubscriptionPayment(event: Omit<SubscriptionPaymentReceived, 'name'>) {
    const existing = await this.repository.findBySubscriptionPaymentId(event.subscriptionPaymentId); if (existing) return toFinancialTransactionEntity(existing);
    try { return toFinancialTransactionEntity(await this.repository.create({ clientId: event.clientId, description: `Assinatura: ${event.subscriptionName}`, category: 'Assinatura', amountCents: event.amountCents, date: event.paidAt, paymentMethod: event.paymentMethod, origin: 'SUBSCRIPTION', type: 'RECEITA', status: 'PAGO', subscriptionId: event.subscriptionId, subscriptionPaymentId: event.subscriptionPaymentId, subscriptionName: event.subscriptionName })); } catch (error: unknown) { const concurrent = await this.repository.findBySubscriptionPaymentId(event.subscriptionPaymentId); if (concurrent) return toFinancialTransactionEntity(concurrent); throw error; }
  }
  async cancel(id: string) { const item = await this.repository.findById(id); if (!item) throw new NotFoundException('Lançamento financeiro não encontrado.'); if (item.status === 'CANCELADO') throw new ConflictException('Lançamento financeiro já está cancelado.'); return toFinancialTransactionEntity(await this.repository.update(id, { status: 'CANCELADO', cancelledAt: new Date() })); }
}

import { ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { FinancialTransactionService } from './financial-transaction.service.js';

const transaction = (overrides: Record<string, unknown> = {}) => ({
  id: 'tx-1', clientId: null, description: 'Receita manual', category: null,
  amountCents: 1000, date: new Date('2026-09-13T12:00:00Z'), paymentMethod: 'PIX',
  origin: 'MANUAL', type: 'RECEITA', status: 'PAGO', appointmentId: null,
  subscriptionId: null, subscriptionPaymentId: null, procedureId: null,
  procedureName: null, subscriptionName: null, externalReference: null, notes: null,
  cancelledAt: null, createdAt: new Date(), updatedAt: new Date(), ...overrides,
});

function setup() {
  const repository = {
    create: vi.fn().mockImplementation(async (data) => transaction(data)),
    findById: vi.fn().mockResolvedValue(transaction()),
    findByAppointmentId: vi.fn().mockResolvedValue(null),
    findBySubscriptionPaymentId: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockImplementation(async (_id, data) => transaction(data)),
  };
  return { repository, service: new FinancialTransactionService(repository as never) };
}

describe('FinancialTransactionService', () => {
  it('cria receita ou despesa manual validada com origem MANUAL', async () => {
    const { service, repository } = setup();
    await service.createManual({ description: '  Material  ', amountCents: 3590, date: '2026-09-13', paymentMethod: 'PIX', type: 'DESPESA', status: 'PAGO', category: 'Insumos' });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ description: 'Material', amountCents: 3590, type: 'DESPESA', origin: 'MANUAL' }));
  });

  it('gera receita com snapshot ao concluir atendimento e é idempotente', async () => {
    const { service, repository } = setup();
    const event = { appointmentId: 'appointment-1', clientId: 'client-1', procedureId: 'procedure-1', procedureName: 'Botox', valueCents: 90000, completedAt: new Date('2026-09-13T12:00:00Z') };
    await service.fromAppointment(event);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 'appointment-1', procedureName: 'Botox', amountCents: 90000, origin: 'APPOINTMENT', type: 'RECEITA' }));
    repository.findByAppointmentId.mockResolvedValue(transaction({ appointmentId: 'appointment-1' }));
    await expect(service.fromAppointment(event)).resolves.toMatchObject({ appointmentId: 'appointment-1' });
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('gera receita com snapshot ao receber pagamento de assinatura e é idempotente', async () => {
    const { service, repository } = setup();
    const event = { subscriptionPaymentId: 'payment-1', subscriptionId: 'subscription-1', clientId: 'client-1', subscriptionName: 'Plano Ouro', amountCents: 9900, paidAt: new Date('2026-09-13T12:00:00Z'), paymentMethod: 'CARTAO_CREDITO' as const };
    await service.fromSubscriptionPayment(event);
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ subscriptionPaymentId: 'payment-1', subscriptionName: 'Plano Ouro', amountCents: 9900, origin: 'SUBSCRIPTION' }));
    repository.findBySubscriptionPaymentId.mockResolvedValue(transaction({ subscriptionPaymentId: 'payment-1' }));
    await service.fromSubscriptionPayment(event);
    expect(repository.create).toHaveBeenCalledTimes(1);
  });

  it('cancela uma única vez sem apagar o lançamento', async () => {
    const { service, repository } = setup();
    await service.cancel('tx-1');
    expect(repository.update).toHaveBeenCalledWith('tx-1', expect.objectContaining({ status: 'CANCELADO', cancelledAt: expect.any(Date) }));
    repository.findById.mockResolvedValue(transaction({ status: 'CANCELADO' }));
    await expect(service.cancel('tx-1')).rejects.toBeInstanceOf(ConflictException);
  });
});

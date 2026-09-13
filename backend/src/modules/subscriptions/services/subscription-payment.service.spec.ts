import { describe, expect, it, vi } from 'vitest';
import { SubscriptionPaymentService } from './subscription-payment.service.js';

describe('SubscriptionPaymentService', () => {
  it('publica SubscriptionPaymentReceived somente depois de persistir o pagamento', async () => {
    const payment = { id: 'payment-1', subscriptionId: 'sub-1', amountCents: 9900, paidAt: new Date('2026-09-13'), paymentMethod: 'PIX', notes: null, createdAt: new Date(), updatedAt: new Date() };
    const payments = { create: vi.fn().mockResolvedValue(payment) };
    const subscriptions = { findById: vi.fn().mockResolvedValue({ id: 'sub-1', clientId: 'client-1', planName: 'Plano Ouro', status: 'ATIVA' }) };
    const events = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new SubscriptionPaymentService(payments as never, subscriptions as never, events as never);
    await service.create('sub-1', { amountCents: 9900, paidAt: '2026-09-13', paymentMethod: 'PIX' });
    expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({ name: 'SubscriptionPaymentReceived', subscriptionPaymentId: 'payment-1', subscriptionName: 'Plano Ouro' }));
    expect(payments.create.mock.invocationCallOrder[0]).toBeLessThan(events.publish.mock.invocationCallOrder[0]);
  });

  it('edita somente campos alterados, sincroniza financeiro e registra ator e motivo', async () => {
    const original = { id: 'payment-1', subscriptionId: 'sub-1', amountCents: 9900, paidAt: new Date('2026-09-13T15:00:00Z'), paymentMethod: 'PIX', notes: null, createdAt: new Date('2026-09-13'), updatedAt: new Date('2026-09-13') };
    const updated = { ...original, amountCents: 10900, notes: 'Parcela corrigida' };
    const payments = { findById: vi.fn().mockResolvedValue(original), updateInTransaction: vi.fn(async (_id, _data, work) => { await work(updated, {}); return updated; }) };
    const financial = { synchronizeSubscriptionPayment: vi.fn().mockResolvedValue(undefined) };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new SubscriptionPaymentService(payments as never, {} as never, undefined, financial as never, audit as never);

    const result = await service.update('payment-1', { amountCents: 10900, paidAt: '2026-09-13T12:00:00-03:00', paymentMethod: 'PIX', notes: 'Parcela corrigida', reason: 'Corrigir valor informado' }, { id: 'user-1', name: 'Maria', email: 'maria@example.com' } as never, 'request-1');

    expect(result.amountCents).toBe(10900);
    expect(financial.synchronizeSubscriptionPayment).toHaveBeenCalledWith(expect.objectContaining({ subscriptionPaymentId: 'payment-1', amountCents: 10900 }), expect.anything());
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ actorUserId: 'user-1', reason: 'Corrigir valor informado', changes: [{ field: 'amountCents', before: 9900, after: 10900 }, { field: 'notes', before: null, after: 'Parcela corrigida' }] }), expect.anything());
  });

  it('rejeita edição sem alteração efetiva', async () => {
    const original = { id: 'payment-1', subscriptionId: 'sub-1', amountCents: 9900, paidAt: new Date('2026-09-13T15:00:00Z'), paymentMethod: 'PIX', notes: null, createdAt: new Date(), updatedAt: new Date() };
    const service = new SubscriptionPaymentService({ findById: vi.fn().mockResolvedValue(original) } as never, {} as never);
    await expect(service.update('payment-1', { amountCents: 9900, paidAt: '2026-09-13T12:00:00-03:00', paymentMethod: 'PIX', notes: '', reason: 'Conferência' }, {} as never, 'request-1')).rejects.toThrow('Nenhuma alteração');
  });
});

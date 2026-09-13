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
});

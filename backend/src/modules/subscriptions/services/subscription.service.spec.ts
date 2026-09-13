import { describe, expect, it, vi } from 'vitest';
import { SubscriptionService } from './subscription.service.js';

describe('SubscriptionService', () => {
  it('contrata plano ativo preservando snapshot comercial', async () => {
    const subscriptions = { findActiveByClientAndPlan: vi.fn().mockResolvedValue(null), create: vi.fn().mockImplementation((data) => ({ id: 'sub-1', status: 'ATIVA', ...data })) };
    const clients = { getById: vi.fn().mockResolvedValue({ id: 'client-1', active: true }) };
    const plans = { getById: vi.fn().mockResolvedValue({ id: 'plan-1', active: true, name: 'Clube anual', priceCents: 120000, periodicity: 'ANUAL', sessionsPerPeriod: 12 }) };
    const service = new SubscriptionService(subscriptions as never, clients as never, plans as never);

    const result = await service.create({ clientId: 'client-1', planId: 'plan-1', startDate: '2026-09-13', paymentMethod: 'PIX' });

    expect(subscriptions.create).toHaveBeenCalledWith(expect.objectContaining({ planName: 'Clube anual', planPeriodicity: 'ANUAL', planSessionsPerPeriod: 12, contractedValueCents: 120000 }));
    expect(result.status).toBe('ATIVA');
  });

  it('recusa contratar plano inativo', async () => {
    const clients = { getById: vi.fn().mockResolvedValue({ id: 'client-1', active: true }) };
    const plans = { getById: vi.fn().mockResolvedValue({ id: 'plan-1', active: false }) };
    const service = new SubscriptionService({} as never, clients as never, plans as never);
    await expect(service.create({ clientId: 'client-1', planId: 'plan-1', startDate: '2026-09-13', paymentMethod: 'PIX' })).rejects.toThrow('Plano inativo');
  });

  it('recusa assinatura ativa duplicada para o mesmo cliente e plano', async () => {
    const subscriptions = { findActiveByClientAndPlan: vi.fn().mockResolvedValue({ id: 'existente' }) };
    const clients = { getById: vi.fn().mockResolvedValue({ id: 'client-1', active: true }) };
    const plans = { getById: vi.fn().mockResolvedValue({ id: 'plan-1', active: true }) };
    const service = new SubscriptionService(subscriptions as never, clients as never, plans as never);

    await expect(service.create({ clientId: 'client-1', planId: 'plan-1', startDate: '2026-09-13', paymentMethod: 'PIX' }))
      .rejects.toThrow('assinatura ativa');
  });

  it('permite cancelar uma assinatura ativa e impede transição de estado final', async () => {
    const repository = {
      findById: vi.fn().mockResolvedValueOnce({ id: 'sub-1', status: 'ATIVA' }).mockResolvedValueOnce({ id: 'sub-1', status: 'CANCELADA' }),
      update: vi.fn().mockImplementation((_id, data) => ({ id: 'sub-1', ...data })),
    };
    const service = new SubscriptionService(repository as never, {} as never, {} as never);
    await expect(service.changeStatus('sub-1', 'CANCELADA')).resolves.toMatchObject({ status: 'CANCELADA' });
    await expect(service.changeStatus('sub-1', 'ATIVA')).rejects.toThrow('Transição');
  });
});

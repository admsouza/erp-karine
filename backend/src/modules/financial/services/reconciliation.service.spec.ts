import { describe, it, expect, vi } from 'vitest';
import { ReconciliationService } from './reconciliation.service.js';
describe('Conciliação', () => {
  it('registra divergência sem modificar movimentos', async () => {
    const cash = {
      transaction: vi.fn(async (work) => work({})),
      period: vi.fn(async () => ({
        id: 'p',
        month: '2098-02',
        closedAt: null,
        balances: [{ accountId: 'a', openingCents: 1000 }],
      })),
      movements: vi.fn(async () => [
        { resourceAccountId: 'a', type: 'DESPESA', amountCents: 200 },
      ]),
    };
    const repository = {
      create: vi.fn(async (data) => ({ id: 'recon', ...data })),
    };
    const audit = { record: vi.fn() };
    const service = new ReconciliationService(
      cash as never,
      repository as never,
      audit as never,
    );
    await service.create(
      {
        periodId: 'p',
        accountId: 'a',
        amountCents: 750,
        reason: 'Extrato bancário',
      },
      { id: 'u' } as never,
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedCents: 800,
        countedCents: 750,
        differenceCents: -50,
      }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalled();
  });
});

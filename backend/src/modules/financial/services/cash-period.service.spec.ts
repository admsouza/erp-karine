import { describe, it, expect, vi } from 'vitest';
import { CashPeriodService } from './cash-period.service.js';
const user = { id: 'user', name: 'Equipe', email: 'test@example.com' };
function setup(periods: unknown[] = []) {
  const repository = {
    transaction: vi.fn(async (work) => work({})),
    periods: vi.fn(async () => periods),
    accounts: vi.fn(async () => [
      { id: 'cash', name: 'Espécie', active: true },
    ]),
    createPeriod: vi.fn(async (data) => ({ id: 'period', ...data })),
    createBalance: vi.fn(async (data) => data),
  };
  const audit = { record: vi.fn() };
  return {
    repository,
    audit,
    service: new CashPeriodService(repository as never, audit as never),
  };
}
describe('Abertura mensal', () => {
  it('recusa período duplicado antes de gravar', async () => {
    const { service, repository } = setup([
      { month: '2026-09', closedAt: null },
    ]);
    await expect(
      service.open({ month: '2026-09' }, user as never),
    ).rejects.toThrow('período');
    expect(repository.createPeriod).not.toHaveBeenCalled();
  });
  it('transporta saldo apurado por local do último fechamento', async () => {
    const { service, repository, audit } = setup([
      {
        month: '2026-08',
        closedAt: new Date(),
        balances: [{ accountId: 'cash', countedCents: 12345 }],
      },
    ]);
    await service.open({ month: '2026-09' }, user as never);
    expect(repository.createBalance).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 'cash', openingCents: 12345 }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalled();
  });
});

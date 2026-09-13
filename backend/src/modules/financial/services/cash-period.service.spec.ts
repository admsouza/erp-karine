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
  it('consolida o saldo total como a soma dos locais no período aberto', async () => {
    const repository = {
      transaction: vi.fn(async (work) => work({})),
      period: vi.fn(async () => ({
        id: 'p1',
        month: '2026-09',
        closedAt: null,
        balances: [
          { id: 'b1', accountId: 'cash', openingCents: 10000, countedCents: null },
          { id: 'b2', accountId: 'bank', openingCents: 20000, countedCents: null },
          { id: 'b3', accountId: 'card', openingCents: 30000, countedCents: null },
        ],
      })),
      movements: vi.fn(async () => [
        { type: 'RECEITA', amountCents: 5000, resourceAccountId: 'cash' },
        { type: 'DESPESA', amountCents: 2000, resourceAccountId: 'bank' },
      ]),
    };
    const service = new CashPeriodService(
      repository as never,
      { record: vi.fn() } as never,
    );
    const detail = await service.detail('p1');
    // O saldo é um só: a composição é a soma dos locais (espécie + banco + maquineta).
    expect(detail.totals).toEqual({
      openingCents: 60000,
      incomingCents: 5000,
      outgoingCents: 2000,
      expectedCents: 63000,
      countedCents: null,
      differenceCents: null,
    });
  });
  it('soma apurado e divergência dos locais quando o período está fechado', async () => {
    const repository = {
      transaction: vi.fn(async (work) => work({})),
      period: vi.fn(async () => ({
        id: 'p2',
        month: '2026-08',
        closedAt: new Date('2026-09-01T00:00:00Z'),
        balances: [
          {
            id: 'b1',
            accountId: 'cash',
            openingCents: 10000,
            incomingCents: 5000,
            outgoingCents: 0,
            expectedCents: 15000,
            countedCents: 14000,
            differenceCents: -1000,
          },
          {
            id: 'b2',
            accountId: 'bank',
            openingCents: 20000,
            incomingCents: 0,
            outgoingCents: 2000,
            expectedCents: 18000,
            countedCents: 18000,
            differenceCents: 0,
          },
        ],
      })),
      movements: vi.fn(async () => []),
    };
    const service = new CashPeriodService(
      repository as never,
      { record: vi.fn() } as never,
    );
    const detail = await service.detail('p2');
    expect(detail.totals).toEqual({
      openingCents: 30000,
      incomingCents: 5000,
      outgoingCents: 2000,
      expectedCents: 33000,
      countedCents: 32000,
      differenceCents: -1000,
    });
  });
});

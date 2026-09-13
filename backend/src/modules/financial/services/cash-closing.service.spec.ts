import { describe, it, expect, vi } from 'vitest';
import { CashClosingService } from './cash-closing.service.js';
const user = { id: 'user', name: 'Equipe', email: 'test@example.com' };
function setup() {
  const repository = {
    transaction: vi.fn(async (work) => work({})),
    period: vi.fn(async () => ({
      id: 'period',
      month: '2098-01',
      closedAt: null,
      balances: [{ id: 'b', accountId: 'cash', openingCents: 1000 }],
    })),
    movements: vi.fn(async () => [
      { resourceAccountId: 'cash', type: 'RECEITA', amountCents: 500 },
      { resourceAccountId: 'cash', type: 'DESPESA', amountCents: 200 },
    ]),
    updateBalance: vi.fn(),
    closePeriod: vi.fn(),
  };
  const audit = { record: vi.fn() };
  return {
    repository,
    audit,
    service: new CashClosingService(repository as never, audit as never),
  };
}
describe('Fechamento', () => {
  it('registra apuração e divergência sem reescrever movimentos', async () => {
    const { service, repository, audit } = setup();
    await service.close(
      'period',
      {
        balances: [{ accountId: 'cash', amountCents: 1200 }],
        reason: 'Conferência mensal',
      },
      user as never,
    );
    expect(repository.updateBalance).toHaveBeenCalledWith(
      'b',
      expect.objectContaining({
        openingCents: 1000,
        incomingCents: 500,
        outgoingCents: 200,
        expectedCents: 1300,
        countedCents: 1200,
        differenceCents: -100,
      }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalled();
  });
  it('recusa fechamento sem conferir todos os locais', async () => {
    const { service, repository } = setup();
    await expect(
      service.close(
        'period',
        { balances: [], reason: 'Conferência' },
        user as never,
      ),
    ).rejects.toThrow();
    expect(repository.closePeriod).not.toHaveBeenCalled();
  });
});

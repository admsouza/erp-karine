import { describe, it, expect, vi } from 'vitest';
import { FinancialTitleService } from './financial-title.service.js';
function setup(paid = 300) {
  const title = {
    id: 'title',
    type: 'RECEITA',
    description: 'Parcela',
    amountCents: 1000,
    cancelledAt: null,
    settlements: [{ amountCents: paid }],
  };
  const repository = {
    transaction: vi.fn(async (work) => work({})),
    find: vi.fn(async () => title),
    settlementByKey: vi.fn(async () => null),
    createSettlement: vi.fn(async (data) => ({ id: 'settlement', ...data })),
  };
  const transactions = { create: vi.fn(async () => ({ id: 'movement' })) };
  const policy = { assertWritable: vi.fn(), assertAccount: vi.fn() };
  const audit = { record: vi.fn() };
  return {
    repository,
    transactions,
    audit,
    service: new FinancialTitleService(
      repository as never,
      transactions as never,
      policy as never,
      audit as never,
    ),
  };
}
const dto = {
  amountCents: 700,
  date: '2098-02-10',
  resourceAccountId: 'cash',
  paymentMethod: 'DINHEIRO' as const,
  idempotencyKey: 'key',
};
const user = { id: 'user', name: 'Equipe', email: 'test@example.com' };
describe('Baixa de títulos', () => {
  it('soma baixa parcial e total sem gerar título como receita', async () => {
    const { service, transactions, repository } = setup();
    await service.settle('title', dto, user as never);
    expect(transactions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amountCents: 700,
        type: 'RECEITA',
        status: 'PAGO',
        resourceAccountId: 'cash',
      }),
      expect.anything(),
    );
    expect(repository.createSettlement).toHaveBeenCalled();
  });
  it('recusa valor maior que o saldo em aberto', async () => {
    const { service, transactions } = setup(800);
    await expect(service.settle('title', dto, user as never)).rejects.toThrow(
      'saldo',
    );
    expect(transactions.create).not.toHaveBeenCalled();
  });
  it('repetição idêntica devolve baixa existente sem novo movimento', async () => {
    const { service, repository, transactions } = setup();
    repository.settlementByKey.mockResolvedValue({
      id: 'same',
      titleId: 'title',
      ...dto,
      date: new Date('2098-02-10T12:00:00-03:00'),
    } as never);
    await expect(
      service.settle('title', dto, user as never),
    ).resolves.toMatchObject({ id: 'same' });
    expect(transactions.create).not.toHaveBeenCalled();
  });
});

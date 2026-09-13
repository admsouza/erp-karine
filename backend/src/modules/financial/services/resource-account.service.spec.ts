import { describe, it, expect, vi } from 'vitest';
import { ResourceAccountService } from './resource-account.service.js';
const user = {
  id: 'user',
  name: 'Equipe',
  email: 'test@example.com',
} as never;
function setup(contas: { id: string; name: string; kind: string; active: boolean }[]) {
  const repository = {
    transaction: vi.fn(async (work) => work({})),
    accounts: vi.fn(async () => contas),
    account: vi.fn(async (id: string) => contas.find((x) => x.id === id) ?? null),
    periods: vi.fn(
      async (): Promise<{ id: string; month: string; closedAt: Date | null }[]> => [],
    ),
    movements: vi.fn(
      async (): Promise<
        { resourceAccountId: string | null; amountCents: number }[]
      > => [],
    ),
    updateAccount: vi.fn(async (id: string, data: unknown) => ({ ...contas[0], id, ...(data as object) })),
    createBalance: vi.fn(async (data) => data),
    deleteBalances: vi.fn(async () => undefined),
  };
  const audit = { record: vi.fn() };
  return {
    repository,
    audit,
    service: new ResourceAccountService(repository as never, audit as never),
  };
}
describe('Edição do local do recurso', () => {
  it('recusa renomear para um nome já usado por outro local', async () => {
    const { service, repository } = setup([
      { id: 'a', name: 'Itaú', kind: 'BANK', active: true },
      { id: 'b', name: 'Nubank', kind: 'BANK', active: true },
    ]);
    await expect(
      service.update('a', { name: 'nubank' }, user),
    ).rejects.toThrow('Já existe um local');
    expect(repository.updateAccount).not.toHaveBeenCalled();
  });
  it('recusa edição sem mudança efetiva', async () => {
    const { service, repository } = setup([
      { id: 'a', name: 'Itaú', kind: 'BANK', active: true },
    ]);
    await expect(
      service.update('a', { name: 'Itaú', kind: 'BANK' as never }, user),
    ).rejects.toThrow('Informe uma alteração');
    expect(repository.updateAccount).not.toHaveBeenCalled();
  });
  it('renomeia e registra somente o campo alterado na trilha', async () => {
    const { service, repository, audit } = setup([
      { id: 'a', name: 'Itau', kind: 'BANK', active: true },
    ]);
    await service.update('a', { name: 'Itaú' }, user);
    expect(repository.updateAccount).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ name: 'Itaú' }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ResourceAccount',
        entityId: 'a',
        action: 'UPDATED',
        changes: [{ field: 'name', before: 'Itau', after: 'Itaú' }],
      }),
      expect.anything(),
    );
  });
  it('bloqueia inativar local com lançamento no mês aberto', async () => {
    const { service, repository } = setup([
      { id: 'a', name: 'Itaú', kind: 'BANK', active: true },
    ]);
    repository.periods = vi.fn(async () => [
      { id: 'p', month: '2026-09', closedAt: null },
    ]);
    repository.movements = vi.fn(async () => [
      { resourceAccountId: 'a', amountCents: 100 },
    ]);
    await expect(service.inactivate('a', user)).rejects.toThrow('mês aberto');
    expect(repository.updateAccount).not.toHaveBeenCalled();
  });
  it('inativa, limpa o saldo do mês aberto e registra na trilha', async () => {
    const { service, repository, audit } = setup([
      { id: 'a', name: 'Itaú', kind: 'BANK', active: true },
    ]);
    repository.periods = vi.fn(async () => [
      { id: 'p', month: '2026-09', closedAt: null },
    ]);
    await service.inactivate('a', user);
    expect(repository.deleteBalances).toHaveBeenCalledWith('p', 'a', expect.anything());
    expect(repository.updateAccount).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ active: false }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'INACTIVATED' }),
      expect.anything(),
    );
  });
  it('reativa e recria o saldo do mês aberto', async () => {
    const { service, repository, audit } = setup([
      { id: 'a', name: 'Itaú', kind: 'BANK', active: false },
    ]);
    repository.periods = vi.fn(async () => [
      { id: 'p', month: '2026-09', closedAt: null },
    ]);
    await service.reactivate('a', user);
    expect(repository.updateAccount).toHaveBeenCalledWith(
      'a',
      expect.objectContaining({ active: true, deactivatedAt: null }),
      expect.anything(),
    );
    expect(repository.createBalance).toHaveBeenCalledWith(
      expect.objectContaining({ periodId: 'p', accountId: 'a', openingCents: 0 }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REACTIVATED' }),
      expect.anything(),
    );
  });
});

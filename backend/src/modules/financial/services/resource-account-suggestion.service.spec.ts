import { describe, it, expect, vi } from 'vitest';
import { ResourceAccountSuggestionService } from './resource-account-suggestion.service.js';
const user = { id: 'u1', name: 'Equipe', email: 'e@x.com' } as never;
function setup(
  sugestoes: {
    id: string;
    name: string;
    kind: string;
    active: boolean;
    deactivatedAt?: Date | null;
  }[] = [],
) {
  const repository = {
    transaction: vi.fn(async (work) => work({})),
    suggestions: vi.fn(async () => sugestoes),
    suggestion: vi.fn(async (id: string) => sugestoes.find((x) => x.id === id) ?? null),
    createSuggestion: vi.fn(async (data) => ({ id: 'nova', ...data })),
    // O mock espelha o repositório: aplica a alteração na "linha" guardada, senão a
    // segunda inativação encontraria o item ainda ativo (double que não reflete o real).
    updateSuggestion: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const alvo = sugestoes.find((x) => x.id === id);
      if (!alvo) throw new Error('não encontrado no mock');
      Object.assign(alvo, data);
      return alvo;
    }),
  };
  const audit = { record: vi.fn() };
  return {
    repository,
    audit,
    service: new ResourceAccountSuggestionService(
      repository as never,
      audit as never,
    ),
  };
}
describe('Identificações sugeridas de local', () => {
  it('cria a identificação e registra a trilha', async () => {
    const { service, repository, audit } = setup();
    await service.create({ name: 'Banco Inter', kind: 'BANK' as never }, user);
    expect(repository.createSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Banco Inter', kind: 'BANK' }),
      expect.anything(),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'ResourceAccountSuggestion',
        action: 'CREATED',
        changes: [
          { field: 'name', before: null, after: 'Banco Inter' },
          { field: 'kind', before: null, after: 'BANK' },
        ],
      }),
      expect.anything(),
    );
  });
  it('recusa identificação repetida sem diferenciar maiúsculas', async () => {
    const { service, repository } = setup([
      { id: 's1', name: 'Itaú', kind: 'BANK', active: true },
    ]);
    await expect(
      service.create({ name: 'itau', kind: 'BANK' as never }, user),
    ).rejects.toThrow('Já existe uma identificação');
    await expect(
      service.create({ name: 'ITAÚ', kind: 'BANK' as never }, user),
    ).rejects.toThrow('Já existe uma identificação');
    expect(repository.createSuggestion).not.toHaveBeenCalled();
  });
  it('edita só o campo alterado e registra antes → depois', async () => {
    const { service, audit } = setup([
      { id: 's1', name: 'Maquineta 1', kind: 'CARD', active: true },
    ]);
    await service.update('s1', { name: 'Maquineta Cielo' }, user);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATED',
        changes: [{ field: 'name', before: 'Maquineta 1', after: 'Maquineta Cielo' }],
      }),
      expect.anything(),
    );
  });
  it('recusa edição sem mudança efetiva', async () => {
    const { service, repository } = setup([
      { id: 's1', name: 'Itaú', kind: 'BANK', active: true },
    ]);
    await expect(
      service.update('s1', { name: 'Itaú', kind: 'BANK' as never }, user),
    ).rejects.toThrow('Informe uma alteração');
    expect(repository.updateSuggestion).not.toHaveBeenCalled();
  });
  it('inativa e reativa com trilha, recusando repetição', async () => {
    const { service, audit } = setup([
      { id: 's1', name: 'Maquineta 2', kind: 'CARD', active: true },
    ]);
    await service.inactivate('s1', user);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'INACTIVATED',
        changes: [{ field: 'active', before: true, after: false }],
      }),
      expect.anything(),
    );
    await expect(service.inactivate('s1', user)).rejects.toThrow('já está inativa');
  });
});

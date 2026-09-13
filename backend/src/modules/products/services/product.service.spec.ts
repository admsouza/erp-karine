import { describe, it, expect, vi } from 'vitest';
import { ProductService } from './product.service.js';

const user = { id: 'u1', name: 'Equipe', email: 'e@x.com' } as never;

function setup(
  produtos: { id: string; name: string; priceCents: number; active: boolean }[] = [],
) {
  const repository = {
    findAll: vi.fn(async () => produtos),
    findById: vi.fn(async (id: string) => produtos.find((x) => x.id === id) ?? null),
    create: vi.fn(async (data) => ({ id: 'novo', active: true, deactivatedAt: null, createdAt: new Date(), updatedAt: new Date(), ...data })),
    // Espelha o repositório: aplica a alteração na linha guardada.
    update: vi.fn(async (id: string, data: Record<string, unknown>) => {
      const alvo = produtos.find((x) => x.id === id);
      if (!alvo) throw new Error('não encontrado no mock');
      Object.assign(alvo, data);
      return { createdAt: new Date(), updatedAt: new Date(), ...alvo };
    }),
  };
  const audit = { record: vi.fn() };
  return { repository, audit, service: new ProductService(repository as never, audit as never) };
}

describe('Catálogo de produtos', () => {
  it('cria o produto com trilha e recusa nome repetido sem diferenciar acentos', async () => {
    const { service, repository, audit } = setup([
      { id: 'p1', name: 'Máscara', priceCents: 12000, active: true },
    ]);
    await service.create(
      { name: 'Sérum Vitamina C', priceCents: 9900, unit: 'unidade' },
      user,
    );
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sérum Vitamina C', priceCents: 9900 }),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ module: 'products', action: 'CREATED' }),
      undefined,
    );
    await expect(
      service.create({ name: 'mascara' }, user),
    ).rejects.toThrow('Já existe um produto');
  });

  it('edita só o campo alterado e recusa edição sem mudança efetiva', async () => {
    const { service, repository, audit } = setup([
      { id: 'p1', name: 'Máscara', priceCents: 12000, active: true },
    ]);
    await service.update('p1', { priceCents: 13500 }, user);
    expect(repository.update).toHaveBeenCalledWith('p1', { priceCents: 13500 });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'UPDATED',
        changes: [{ field: 'priceCents', before: 12000, after: 13500 }],
      }),
      undefined,
    );
    await expect(
      service.update('p1', { priceCents: 13500 }, user),
    ).rejects.toThrow('Informe uma alteração');
  });

  it('inativa, reativa e recusa repetição', async () => {
    const { service, audit } = setup([
      { id: 'p1', name: 'Máscara', priceCents: 12000, active: true },
    ]);
    await service.inactivate('p1', user);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'INACTIVATED',
        changes: [{ field: 'active', before: true, after: false }],
      }),
      undefined,
    );
    await expect(service.inactivate('p1', user)).rejects.toThrow('já está inativo');
    await service.reactivate('p1', user);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'REACTIVATED' }),
      undefined,
    );
  });
});

import { describe, it, expect, vi } from 'vitest';
import { MaintenanceService } from './maintenance.service.js';
const user = { id: 'u1', name: 'Equipe', email: 'e@x.com' } as never;
function setup() {
  const clientes = {
    list: vi.fn(async () => ({
      items: [
        {
          id: 'c1',
          fullName: 'Ana Souza',
          phone: '(83) 99999-0000',
          active: true,
          updatedAt: new Date('2026-09-01T10:00:00Z'),
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
    })),
    getById: vi.fn(async () => ({
      id: 'c1',
      fullName: 'Ana Souza',
      phone: '(83) 99999-0000',
      active: true,
    })),
  };
  const servicoClientes = { update: vi.fn(async (id) => ({ id })) };
  const procedimentos = {
    list: vi.fn(async () => ({ items: [], total: 0, page: 1, pageSize: 20 })),
    getById: vi.fn(),
  };
  const servicoProcedimentos = {
    update: vi.fn(),
    inactivate: vi.fn(async (id: string) => ({ id, active: false })),
    reactivate: vi.fn(),
  };
  const planos = {
    list: vi.fn(async () => [
      { id: 'p1', name: 'Plano Mensal', priceCents: 25000, active: false },
    ]),
    getById: vi.fn(),
  };
  const servicoPlanos = {
    update: vi.fn(),
    inactivate: vi.fn(async (id: string) => ({ id, active: false })),
    reactivate: vi.fn(),
  };
  const locais = {
    list: vi.fn(async () => [
      { id: 'l1', name: 'Dinheiro (gaveta)', kind: 'CASH', active: true, updatedAt: new Date() },
      { id: 'l2', name: 'Maquineta principal', kind: 'CARD', active: false, updatedAt: new Date() },
    ]),
    update: vi.fn(async (id: string) => ({ id })),
    inactivate: vi.fn(),
    reactivate: vi.fn(),
  };
  const auditoria = { record: vi.fn() };
  const service = new MaintenanceService(
    clientes as never,
    servicoClientes as never,
    procedimentos as never,
    servicoProcedimentos as never,
    planos as never,
    servicoPlanos as never,
    locais as never,
    auditoria as never,
  );
  return {
    service,
    clientes,
    servicoClientes,
    servicoProcedimentos,
    locais,
    servicoPlanos,
    auditoria,
  };
}
describe('Manutenção de cadastros', () => {
  it('lista os locais do recurso com rótulo e detalhe legíveis', async () => {
    const { service, locais } = setup();
    const pagina = await service.list({ type: 'RESOURCE_ACCOUNT' });
    expect(locais.list).toHaveBeenCalled();
    expect(pagina.items).toEqual([
      expect.objectContaining({
        id: 'l1',
        type: 'RESOURCE_ACCOUNT',
        label: 'Dinheiro (gaveta)',
        secondary: 'Espécie',
        active: true,
        values: { name: 'Dinheiro (gaveta)', kind: 'CASH' },
      }),
      expect.objectContaining({
        id: 'l2',
        label: 'Maquineta principal',
        secondary: 'Conta de maquineta',
        active: false,
        values: { name: 'Maquineta principal', kind: 'CARD' },
      }),
    ]);
  });
  it('filtra por situação e por busca quando o dono não pagina', async () => {
    const { service } = setup();
    const inativos = await service.list({
      type: 'RESOURCE_ACCOUNT',
      active: 'false',
    });
    expect(inativos.items.map((x) => x.id)).toEqual(['l2']);
    const busca = await service.list({
      type: 'RESOURCE_ACCOUNT',
      search: 'maquineta',
    });
    expect(busca.items.map((x) => x.id)).toEqual(['l2']);
  });
  it('delega a edição do cliente ao módulo dono e registra a trilha (o dono não registra)', async () => {
    const { service, servicoClientes, auditoria } = setup();
    await service.update('CLIENT', 'c1', { name: 'Ana Souza Lima' }, user);
    expect(servicoClientes.update).toHaveBeenCalledWith('c1', {
      fullName: 'Ana Souza Lima',
    });
    expect(auditoria.record).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'maintenance',
        entityType: 'Client',
        entityId: 'c1',
        action: 'UPDATED',
        changes: [{ field: 'fullName', before: 'Ana Souza', after: 'Ana Souza Lima' }],
      }),
      undefined,
    );
  });
  it('não duplica a trilha quando o módulo dono já registra (local do recurso)', async () => {
    const { service, locais, auditoria } = setup();
    await service.update('RESOURCE_ACCOUNT', 'l1', { name: 'Gaveta' }, user);
    expect(locais.update).toHaveBeenCalled();
    expect(auditoria.record).not.toHaveBeenCalled();
  });
  it('inativa plano pelo hub e registra a trilha', async () => {
    const { service, servicoPlanos, auditoria } = setup();
    await service.inactivate('SUBSCRIPTION_PLAN', 'p1', user);
    expect(servicoPlanos.inactivate).toHaveBeenCalledWith('p1');
    expect(auditoria.record).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: 'SubscriptionPlan',
        action: 'INACTIVATED',
        changes: [{ field: 'active', before: true, after: false }],
      }),
      undefined,
    );
  });
  it('recusa edição sem nenhum campo aplicável ao tipo', async () => {
    const { service } = setup();
    await expect(
      service.update('CLIENT', 'c1', {}, user),
    ).rejects.toThrow('Informe ao menos um campo');
  });
  it('recusa tipo de cadastro desconhecido', async () => {
    const { service } = setup();
    await expect(
      service.list({ type: 'INEXISTENTE' as never }),
    ).rejects.toThrow('Tipo de cadastro inválido');
  });
});

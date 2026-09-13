import { ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcedureService } from './procedure.service.js';
import type { ProcedureQueryService } from './procedure-query.service.js';
import type { ProcedureRepository } from '../repositories/procedure.repository.js';
import type { ProcedureEntity } from '../entities/procedure.entity.js';

function procedimento(overrides: Partial<ProcedureEntity> = {}): ProcedureEntity {
  return {
    id: 'proc-1',
    name: 'Limpeza de pele',
    description: 'Higienização e extração',
    defaultValueCents: 18000,
    durationMinutes: 60,
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function montar(atual: ProcedureEntity = procedimento(), duplicado: ProcedureEntity | null = null) {
  const repository = {
    create: vi.fn().mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ ...atual, ...data }),
    ),
    update: vi.fn().mockImplementation((_id: string, data: Record<string, unknown>) =>
      Promise.resolve({ ...atual, ...data }),
    ),
    findById: vi.fn().mockResolvedValue(atual),
    findByName: vi.fn().mockResolvedValue(duplicado),
    findPage: vi.fn(),
  } as unknown as ProcedureRepository;

  const queries = {
    findById: vi.fn().mockResolvedValue(atual),
    getById: vi.fn().mockResolvedValue(atual),
    exists: vi.fn().mockResolvedValue(true),
    list: vi.fn(),
  } as unknown as ProcedureQueryService;

  return { service: new ProcedureService(repository, queries), repository, queries };
}

describe('ProcedureService', () => {
  let base: ProcedureEntity;

  beforeEach(() => {
    base = procedimento();
  });

  it('cadastra procedimento com valor padrão zero quando não informado', async () => {
    const { service, repository } = montar();
    const criado = await service.create({ name: 'Drenagem linfática' } as never);

    expect(criado.name).toBe('Drenagem linfática');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Drenagem linfática', defaultValueCents: 0, durationMinutes: null }),
    );
  });

  it('recusa nome já cadastrado (409)', async () => {
    const { service } = montar(base, procedimento({ id: 'outro' }));
    await expect(service.create({ name: 'Limpeza de pele' } as never)).rejects.toThrow(ConflictException);
  });

  it('aceita o mesmo nome quando é o próprio registro sendo editado', async () => {
    const { service } = montar(base, procedimento({ id: 'proc-1' }));
    const atualizado = await service.update('proc-1', { name: 'Limpeza de pele' });
    expect(atualizado.name).toBe('Limpeza de pele');
  });

  it('recusa renomear para um nome de outro procedimento', async () => {
    const { service } = montar(base, procedimento({ id: 'outro' }));
    await expect(service.update('proc-1', { name: 'Massagem' })).rejects.toThrow(ConflictException);
  });

  it('inativa sem excluir e recusa repetir a inativação', async () => {
    const { service, repository } = montar();
    const inativado = await service.inactivate('proc-1');
    expect(inativado.active).toBe(false);
    expect(repository.update).toHaveBeenCalledWith('proc-1', { active: false });

    const { service: jaInativo } = montar(procedimento({ active: false }));
    await expect(jaInativo.inactivate('proc-1')).rejects.toThrow(ConflictException);
  });

  it('reativa e recusa repetir a reativação', async () => {
    const { service } = montar(procedimento({ active: false }));
    expect((await service.reactivate('proc-1')).active).toBe(true);

    const { service: jaAtivo } = montar(procedimento({ active: true }));
    await expect(jaAtivo.reactivate('proc-1')).rejects.toThrow(ConflictException);
  });

  it('edita apenas os campos enviados', async () => {
    const { service, repository } = montar();
    await service.update('proc-1', { durationMinutes: 90 });

    expect(repository.update).toHaveBeenCalledWith('proc-1', { durationMinutes: 90 });
  });
});

import { BadRequestException, ConflictException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ClientEntity } from '../entities/client.entity.js';
import type { ClientRepository } from '../repositories/client.repository.js';
import { ClientQueryService } from './client-query.service.js';
import { ClientService } from './client.service.js';

const VALID_CPF = '52998224725';

const stored: ClientEntity = {
  id: 'client-id-1',
  fullName: 'Maria da Silva',
  cpf: VALID_CPF,
  birthDate: new Date('1985-04-12T00:00:00.000Z'),
  phone: null,
  whatsapp: null,
  email: null,
  address: null,
  notes: null,
  active: true,
  deactivatedAt: null,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-01T10:00:00.000Z'),
};

function createMocks() {
  const repository = {
    create: vi.fn(),
    update: vi.fn(),
    findById: vi.fn(),
    findByCpf: vi.fn(),
    findPage: vi.fn(),
  };
  const queries = new ClientQueryService(repository as unknown as ClientRepository);
  const service = new ClientService(repository as unknown as ClientRepository, queries);
  return { repository, queries, service };
}

describe('ClientService', () => {
  let mocks: ReturnType<typeof createMocks>;

  beforeEach(() => {
    mocks = createMocks();
    mocks.repository.findByCpf.mockResolvedValue(null);
    mocks.repository.findById.mockResolvedValue(stored);
    mocks.repository.create.mockImplementation((data: unknown) => ({ ...stored, ...(data as object) }));
    mocks.repository.update.mockImplementation((_id: string, data: object) => ({ ...stored, ...data }));
  });

  it('cadastra cliente normalizando o CPF (aceita máscara)', async () => {
    await mocks.service.create({ fullName: 'Maria da Silva', cpf: '529.982.247-25' });

    expect(mocks.repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: 'Maria da Silva', cpf: VALID_CPF }),
    );
  });

  it('recusa CPF já cadastrado', async () => {
    mocks.repository.findByCpf.mockResolvedValue(stored);

    await expect(
      mocks.service.create({ fullName: 'Outro Cliente', cpf: VALID_CPF }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(mocks.repository.create).not.toHaveBeenCalled();
  });

  it('recusa data de nascimento futura', async () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

    await expect(
      mocks.service.create({ fullName: 'Cliente', birthDate: tomorrow }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('inativa o cliente preenchendo deactivatedAt', async () => {
    await mocks.service.inactivate(stored.id);

    expect(mocks.repository.update).toHaveBeenCalledWith(
      stored.id,
      expect.objectContaining({ active: false, deactivatedAt: expect.any(Date) }),
    );
  });

  it('recusa inativar cliente que já está inativo', async () => {
    mocks.repository.findById.mockResolvedValue({ ...stored, active: false });

    await expect(mocks.service.inactivate(stored.id)).rejects.toBeInstanceOf(ConflictException);
  });

  it('reativa o cliente limpando deactivatedAt', async () => {
    mocks.repository.findById.mockResolvedValue({ ...stored, active: false, deactivatedAt: new Date() });

    await mocks.service.reactivate(stored.id);

    expect(mocks.repository.update).toHaveBeenCalledWith(
      stored.id,
      expect.objectContaining({ active: true, deactivatedAt: null }),
    );
  });
});

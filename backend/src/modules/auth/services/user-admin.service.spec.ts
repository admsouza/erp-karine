import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../entities/authenticated-user.entity.js';
import { UserAdminService } from './user-admin.service.js';

const ator = { id: 'admin-1', name: 'Admin', email: 'admin@teste.local', role: 'ADMIN', mustChangePassword: false, sessionId: 's1' } as AuthenticatedUser;

const usuario = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1', name: 'Maria', email: 'maria@teste.local', passwordHash: 'hash', role: 'USER',
  active: true, mustChangePassword: false, lastLoginAt: null, createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
});

function setup() {
  const users = {
    findById: vi.fn().mockResolvedValue(usuario()),
    findByEmail: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation(async (data: Record<string, unknown>) => usuario({ ...data, id: 'novo' })),
    update: vi.fn().mockImplementation(async (id: string, data: Record<string, unknown>) => usuario({ id, ...data })),
    countActiveAdmins: vi.fn().mockResolvedValue(2),
    findManyWithFilters: vi.fn().mockResolvedValue({ items: [usuario()], total: 1, page: 1, pageSize: 20 }),
  };
  const sessions = { revokeAllForUser: vi.fn().mockResolvedValue(3) };
  const audit = { record: vi.fn().mockResolvedValue(undefined) };
  const service = new UserAdminService(users as never, sessions as never, audit as never);
  return { service, users, sessions, audit };
}

describe('UserAdminService', () => {
  it('lista sem expor o hash da senha', async () => {
    const { service } = setup();
    const pagina = await service.list({ page: 1, pageSize: 20 } as never);
    expect(pagina.items[0]).not.toHaveProperty('passwordHash');
    expect(pagina.items[0]).toMatchObject({ email: 'maria@teste.local', role: 'USER', active: true });
  });

  it('cria usuário com senha hasheada e troca obrigatória, registrando na auditoria', async () => {
    const { service, users, audit } = setup();
    const criado = await service.create({ name: '  Maria  ', email: ' MARIA@Teste.local ', password: 'Senha123', role: 'USER' } as never, ator);
    expect(criado).not.toHaveProperty('passwordHash');
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Maria', email: 'maria@teste.local', mustChangePassword: true }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'User', action: 'CREATED', module: 'auth' }));
  });

  it('recusa e-mail já cadastrado', async () => {
    const { service, users } = setup();
    users.findByEmail.mockResolvedValue(usuario());
    await expect(service.create({ name: 'Maria', email: 'maria@teste.local', password: 'Senha123', role: 'USER' } as never, ator)).rejects.toThrow(ConflictException);
  });

  it('impede o admin de tirar o próprio perfil de administrador', async () => {
    const { service, users } = setup();
    users.findById.mockResolvedValue(usuario({ id: 'admin-1', role: 'ADMIN' }));
    await expect(service.changeRole('admin-1', 'USER', ator)).rejects.toThrow(BadRequestException);
  });

  it('impede rebaixar o último administrador ativo', async () => {
    const { service, users } = setup();
    users.findById.mockResolvedValue(usuario({ role: 'ADMIN' }));
    users.countActiveAdmins.mockResolvedValue(1);
    await expect(service.changeRole('user-1', 'USER', ator)).rejects.toThrow(ConflictException);
  });

  it('inativa usuário encerrando as sessões e registrando o autor', async () => {
    const { service, sessions, audit } = setup();
    const resultado = await service.setActive('user-1', false, ator);
    expect(resultado).toMatchObject({ active: false, sessoesEncerradas: 3 });
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('user-1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ changes: [{ field: 'active', before: true, after: false }] }));
  });

  it('impede inativar o próprio usuário e rebaixar o último admin', async () => {
    const { service, users } = setup();
    users.findById.mockResolvedValue(usuario({ id: 'admin-1', role: 'ADMIN' }));
    await expect(service.setActive('admin-1', false, ator)).rejects.toThrow(BadRequestException);

    users.findById.mockResolvedValue(usuario({ role: 'ADMIN' }));
    users.countActiveAdmins.mockResolvedValue(1);
    await expect(service.changeRole('user-1', 'USER', ator)).rejects.toThrow(ConflictException);
  });

  it('redefine a senha com troca obrigatória, sem registrar a senha na trilha', async () => {
    const { service, users, sessions, audit } = setup();
    const resultado = await service.resetPassword('user-1', 'NovaSenha123', ator);
    expect(resultado.sessoesEncerradas).toBe(3);
    expect(users.update).toHaveBeenCalledWith('user-1', expect.objectContaining({ mustChangePassword: true }));
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('user-1');
    const evento = audit.record.mock.calls[0][0];
    expect(JSON.stringify(evento)).not.toContain('NovaSenha123');
  });

  it('responde 404 para usuário inexistente', async () => {
    const { service, users } = setup();
    users.findById.mockResolvedValue(null);
    await expect(service.changeRole('00000000-0000-0000-0000-000000000000', 'USER', ator)).rejects.toThrow(NotFoundException);
  });
});

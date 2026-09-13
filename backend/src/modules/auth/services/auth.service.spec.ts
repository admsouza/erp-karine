import { BadRequestException, HttpException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import type { SessionService } from './session.service.js';
import { LoginThrottleService } from './login-throttle.service.js';
import type { UserRepository } from '../repositories/user.repository.js';
import type { AuthenticatedUser } from '../entities/authenticated-user.entity.js';
import type { User } from '../../../generated/prisma/client.js';

const SENHA = 'SenhaForte123';

async function usuario(overrides: Partial<User> = {}): Promise<User> {
  return {
    id: 'user-1',
    name: 'Dra. Karine',
    email: 'karine@clinica.local',
    passwordHash: await bcrypt.hash(SENHA, 4),
    role: 'ADMIN',
    active: true,
    mustChangePassword: false,
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function montar(user: User) {
  const users = {
    // devolve o usuário só para o e-mail dele: o mock precisa respeitar a busca
    findByEmail: vi.fn((email: string) => Promise.resolve(email === user.email ? user : null)),
    findById: vi.fn().mockResolvedValue(user),
    update: vi.fn().mockResolvedValue(user),
    create: vi.fn(),
    count: vi.fn(),
  } as unknown as UserRepository;

  const sessions = {
    issue: vi.fn().mockResolvedValue({
      token: 'token-de-teste',
      expiresAt: new Date(Date.now() + 3600_000),
      sessionId: 'sess-1',
    }),
    revokeByToken: vi.fn(),
    resolve: vi.fn(),
    revokeAllForUser: vi.fn().mockResolvedValue(2),
  } as unknown as SessionService;

  const service = new AuthService(users, sessions, new LoginThrottleService());
  return { service, users, sessions };
}

const contexto = { ip: '127.0.0.1', userAgent: 'vitest' };
const autenticado: AuthenticatedUser = {
  id: 'user-1',
  name: 'Dra. Karine',
  email: 'karine@clinica.local',
  role: 'ADMIN',
  mustChangePassword: false,
  sessionId: 'sess-1',
};

describe('AuthService', () => {
  let base: User;

  beforeEach(async () => {
    base = await usuario();
  });

  it('autentica com a senha correta e registra o último acesso', async () => {
    const { service, users } = montar(base);
    const resultado = await service.login(
      { email: 'karine@clinica.local', password: SENHA } as never,
      contexto,
    );

    expect(resultado.token).toBe('token-de-teste');
    expect(resultado.user.email).toBe('karine@clinica.local');
    expect(users.update).toHaveBeenCalledWith('user-1', { lastLoginAt: expect.any(Date) as unknown as Date });
  });

  it('recusa senha incorreta sem revelar se o e-mail existe', async () => {
    const { service } = montar(base);

    await expect(
      service.login({ email: 'karine@clinica.local', password: 'ErradaTotal123' } as never, contexto),
    ).rejects.toThrow(UnauthorizedException);

    await expect(
      service.login({ email: 'ninguem@clinica.local', password: SENHA } as never, contexto),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('recusa usuário inativo', async () => {
    const { service } = montar(await usuario({ active: false }));
    await expect(
      service.login({ email: 'karine@clinica.local', password: SENHA } as never, contexto),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('bloqueia com 429 depois de 5 falhas seguidas', async () => {
    const { service } = montar(base);
    for (let i = 0; i < 5; i += 1) {
      await expect(
        service.login({ email: 'karine@clinica.local', password: 'ErradaTotal123' } as never, contexto),
      ).rejects.toThrow(UnauthorizedException);
    }
    await expect(
      service.login({ email: 'karine@clinica.local', password: SENHA } as never, contexto),
    ).rejects.toThrow(HttpException);
  });

  it('troca a senha e derruba as outras sessões', async () => {
    const { service, users, sessions } = montar(base);
    const resultado = await service.changePassword(autenticado, SENHA, 'OutraSenha123');

    expect(resultado.revokedOthers).toBe(2);
    expect(users.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ mustChangePassword: false }),
    );
    expect(sessions.revokeAllForUser).toHaveBeenCalledWith('user-1', 'sess-1');
  });

  it('recusa troca com senha atual errada', async () => {
    const { service } = montar(base);
    await expect(service.changePassword(autenticado, 'ErradaTotal123', 'OutraSenha123')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('recusa nova senha fraca ou igual à atual', async () => {
    const { service } = montar(base);
    await expect(service.changePassword(autenticado, SENHA, 'semnumero')).rejects.toThrow(BadRequestException);
    await expect(service.changePassword(autenticado, SENHA, SENHA)).rejects.toThrow(BadRequestException);
    await expect(service.changePassword(autenticado, SENHA, 'Karine123456')).resolves.toBeDefined();
  });

  it('recusa nova senha igual ao e-mail', async () => {
    const { service } = montar(await usuario({ email: 'clinica123@teste.local' }));
    await expect(service.changePassword(autenticado, SENHA, 'clinica123@teste.local')).rejects.toThrow(
      BadRequestException,
    );
  });
});

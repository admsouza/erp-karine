import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';
import { RolesGuard } from './roles.guard.js';

function contexto(user?: { role: string }): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function guard(reflector: Reflector) {
  return new RolesGuard(reflector);
}

describe('RolesGuard', () => {
  it('libera rota sem @Roles para qualquer sessão', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(undefined) } as unknown as Reflector;
    expect(guard(reflector).canActivate(contexto({ role: 'USER' }))).toBe(true);
  });

  it('libera quando o perfil está entre os exigidos', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    expect(guard(reflector).canActivate(contexto({ role: 'ADMIN' }))).toBe(true);
  });

  it('recusa perfil diferente do exigido', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    expect(() => guard(reflector).canActivate(contexto({ role: 'USER' }))).toThrow(ForbiddenException);
  });

  it('falha fechado quando não há usuário na requisição', () => {
    const reflector = { getAllAndOverride: vi.fn().mockReturnValue(['ADMIN']) } as unknown as Reflector;
    expect(() => guard(reflector).canActivate(contexto(undefined))).toThrow(ForbiddenException);
  });
});

import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Role } from '../../generated/prisma/client.js';
import type { AuthenticatedUser } from '../../modules/auth/entities/authenticated-user.entity.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * Autorização por perfil.
 *
 * Falha **fechado**: rota marcada com `@Roles(...)` e sem usuário na requisição
 * devolve 403 (o guard de sessão já teria barrado antes; isto é defesa em profundidade).
 * Rota sem `@Roles` continua liberada para qualquer sessão válida, como antes.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exigidos = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!exigidos || exigidos.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const usuario = request.user;

    if (!usuario || !exigidos.includes(usuario.role)) {
      throw new ForbiddenException('Seu perfil não tem acesso a esta área.');
    }

    return true;
  }
}

import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator.js';
import { SESSION_COOKIE, SessionService } from '../services/session.service.js';
import type { AuthenticatedUser } from '../entities/authenticated-user.entity.js';

interface RequestComSessao {
  cookies?: Record<string, string>;
  user?: AuthenticatedUser;
}

/**
 * Guard global: toda rota de `/api` exige sessão válida, exceto as marcadas
 * com `@Public()` (health e login).
 */
@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const publico = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (publico) return true;

    const request = context.switchToHttp().getRequest<RequestComSessao>();
    const user = await this.sessions.resolve(request.cookies?.[SESSION_COOKIE]);
    if (!user) {
      throw new UnauthorizedException('Sessão expirada ou inexistente. Faça login para continuar.');
    }

    request.user = user;
    return true;
  }
}

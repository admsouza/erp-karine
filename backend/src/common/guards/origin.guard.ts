import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Defesa de CSRF para autenticação por cookie.
 *
 * O cookie de sessão é `SameSite=Lax`, o que já bloqueia POST cross-site na
 * maioria dos navegadores. Aqui vai a segunda barreira: se a requisição de
 * escrita traz `Origin`/`Referer`, ele precisa ser da própria aplicação.
 *
 * Requisição sem `Origin` (curl, testes, integração servidor-a-servidor) passa —
 * não é navegador, então não carrega cookie de vítima.
 */
@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method: string;
      headers: Record<string, string | undefined>;
      hostname?: string;
    }>();

    if (METODOS_SEGUROS.has(request.method)) return true;

    const origem = request.headers.origin ?? request.headers.referer;
    if (!origem) return true;

    let hostOrigem: string;
    try {
      hostOrigem = new URL(origem).host;
    } catch {
      throw new ForbiddenException('Origem inválida na requisição.');
    }

    const hostAtual = request.headers.host ?? request.hostname ?? '';
    if (hostOrigem !== hostAtual) {
      throw new ForbiddenException('Requisição recusada: origem diferente da aplicação.');
    }
    return true;
  }
}

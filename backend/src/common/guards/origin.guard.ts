import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** `host:porta` de uma URL, ou null se não for URL válida. */
function hostDe(valor: string | undefined | null): string | null {
  if (!valor) return null;
  try {
    return new URL(valor).host;
  } catch {
    return valor.includes('/') ? null : valor;
  }
}

/** Remove a porta: `127.0.0.1:5173` → `127.0.0.1`. */
function semPorta(host: string): string {
  return host.replace(/:\d+$/, '');
}

/**
 * Defesa de CSRF para autenticação por cookie.
 *
 * O cookie de sessão é `SameSite=Lax`, o que já bloqueia POST cross-site na
 * maioria dos navegadores. Aqui vai a segunda barreira: se a requisição de
 * escrita traz `Origin`/`Referer`, ele precisa ser da própria aplicação.
 *
 * Passam:
 * - requisição **sem** `Origin` (curl, testes, integração servidor-a-servidor —
 *   não é navegador, então não carrega cookie de vítima);
 * - `Origin` igual ao host da requisição (`Host` ou `X-Forwarded-Host`, este
 *   último porque em produção quem responde é o nginx do CapRover);
 * - `Origin` presente em `CORS_ORIGINS` (necessário em desenvolvimento, onde o
 *   proxy do Vite troca o `Host` antes de chegar na API);
 * - **mesmo hostname** com porta diferente — o mundo real de dev (`:5173` →
 *   `:3001`); um atacante não consegue servir conteúdo de página a partir do
 *   domínio da clínica.
 *
 * Não passa: `Origin` de outro hostname (403), que é o caso de CSRF de verdade.
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

    const hostOrigem = hostDe(origem);
    if (!hostOrigem) {
      throw new ForbiddenException('Origem inválida na requisição.');
    }

    const permitidos = new Set<string>();
    for (const bruto of [
      request.headers.host,
      request.headers['x-forwarded-host'],
      ...(process.env.CORS_ORIGINS ?? '').split(','),
    ]) {
      const host = hostDe(bruto?.trim());
      if (host) permitidos.add(host);
    }

    const liberado =
      permitidos.has(hostOrigem) ||
      [...permitidos].some((host) => semPorta(host) === semPorta(hostOrigem));

    if (!liberado) {
      throw new ForbiddenException('Requisição recusada: origem diferente da aplicação.');
    }
    return true;
  }
}

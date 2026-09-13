import { Injectable } from '@nestjs/common';

const MAX_TENTATIVAS = 5;
const BLOQUEIO_MS = 15 * 60 * 1000;

/**
 * Limite de tentativas de login por (IP + e-mail).
 *
 * Em memória, portanto por instância — suficiente porque o app roda com uma
 * instância (`instanceCount = 1`). Se um dia escalar, trocar por Redis.
 */
@Injectable()
export class LoginThrottleService {
  private readonly tentativas = new Map<string, { falhas: number; bloqueadoAte: number }>();

  private chave(ip: string, email: string): string {
    return `${ip}|${email.toLowerCase()}`;
  }

  /** Segundos restantes de bloqueio (0 = liberado). */
  blockedFor(ip: string, email: string): number {
    const registro = this.tentativas.get(this.chave(ip, email));
    if (!registro?.bloqueadoAte) return 0;
    const restante = registro.bloqueadoAte - Date.now();
    return restante > 0 ? Math.ceil(restante / 1000) : 0;
  }

  registerFailure(ip: string, email: string): void {
    const chave = this.chave(ip, email);
    const registro = this.tentativas.get(chave) ?? { falhas: 0, bloqueadoAte: 0 };
    registro.falhas += 1;
    if (registro.falhas >= MAX_TENTATIVAS) {
      registro.bloqueadoAte = Date.now() + BLOQUEIO_MS;
      registro.falhas = 0;
    }
    this.tentativas.set(chave, registro);
  }

  reset(ip: string, email: string): void {
    this.tentativas.delete(this.chave(ip, email));
  }
}

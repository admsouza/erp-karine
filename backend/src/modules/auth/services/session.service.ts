import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { SessionRepository } from '../repositories/session.repository.js';
import type { User } from '../../../generated/prisma/client.js';
import { toAuthenticatedUser, type AuthenticatedUser } from '../entities/authenticated-user.entity.js';

/** Nome do cookie de sessão (httpOnly; o JavaScript do navegador não lê). */
export const SESSION_COOKIE = 'erp_session';

/** Duração da sessão; renovada a cada requisição autenticada (sliding). */
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SessionContext {
  userAgent?: string;
  ip?: string;
}

@Injectable()
export class SessionService {
  constructor(private readonly sessions: SessionRepository) {}

  /** Cria a sessão e devolve o token em claro (só aqui ele existe fora do hash). */
  async issue(
    user: User,
    context: SessionContext,
  ): Promise<{ token: string; expiresAt: Date; sessionId: string }> {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const session = await this.sessions.create({
      userId: user.id,
      tokenHash: hashToken(token),
      userAgent: context.userAgent?.slice(0, 200) ?? null,
      ip: context.ip ?? null,
      expiresAt,
    });
    return { token, expiresAt, sessionId: session.id };
  }

  /** Valida o token e devolve o usuário; renova a validade (sliding). */
  async resolve(token: string | undefined): Promise<AuthenticatedUser | null> {
    if (!token) return null;
    const session = await this.sessions.findActiveByTokenHash(hashToken(token));
    if (!session || !session.user.active) return null;

    const restante = session.expiresAt.getTime() - Date.now();
    if (restante < SESSION_TTL_MS / 2) {
      await this.sessions.extend(session.id, new Date(Date.now() + SESSION_TTL_MS));
    }
    return toAuthenticatedUser(session.user, session.id);
  }

  async revokeByToken(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.sessions.revokeByTokenHash(hashToken(token));
  }

  revokeAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    return this.sessions.revokeAllForUser(userId, exceptSessionId);
  }
}

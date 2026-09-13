import { Injectable } from '@nestjs/common';
import type { Prisma, Session, User } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

export type SessionWithUser = Session & { user: User };

/** Único ponto do módulo `auth` que fala com o Prisma na tabela `Session`. */
@Injectable()
export class SessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.SessionUncheckedCreateInput): Promise<Session> {
    return this.prisma.session.create({ data });
  }

  findActiveByTokenHash(tokenHash: string): Promise<SessionWithUser | null> {
    return this.prisma.session.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
  }

  extend(id: string, expiresAt: Date): Promise<Session> {
    return this.prisma.session.update({ where: { id }, data: { expiresAt } });
  }

  async revokeByTokenHash(tokenHash: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  async revokeAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptSessionId ? { id: { not: exceptSessionId } } : {}),
      },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }

  /** Limpeza de sessões vencidas ou já revogadas há mais de 30 dias. */
  async purgeExpired(): Promise<number> {
    const limite = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.session.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: limite } }] },
    });
    return result.count;
  }
}

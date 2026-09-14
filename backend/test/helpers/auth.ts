import type { INestApplication } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { PrismaService } from '../../src/common/database/prisma.service.js';

export interface TestSession {
  userId: string;
  email: string;
  password: string;
  /** Valor pronto para o header `Cookie`. */
  cookie: string;
}

/**
 * Cria um usuário de teste e faz login de verdade (passando pelo guard),
 * devolvendo o cookie de sessão para as requisições autenticadas.
 */
export async function createSession(
  app: INestApplication,
  rotulo = 'e2e',
  role: 'ADMIN' | 'USER' = 'ADMIN',
): Promise<TestSession> {
  const prisma = app.get(PrismaService);
  const email = `${rotulo}.${Math.random().toString(36).slice(2, 8)}@teste.local`;
  const password = 'SenhaE2e123';

  const user = await prisma.user.create({
    data: {
      name: 'Usuário de teste',
      email,
      passwordHash: await bcrypt.hash(password, 4),
      role,
    },
  });

  const response = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);

  const setCookie = response.headers['set-cookie'] as unknown as string[];
  const cookie = setCookie[0].split(';')[0];

  return { userId: user.id, email, password, cookie };
}

/** Remove o usuário de teste (as sessões caem junto por cascade). */
export async function destroySession(app: INestApplication, session: TestSession): Promise<void> {
  const prisma = app.get(PrismaService);
  await prisma.session.deleteMany({ where: { userId: session.userId } });
  await prisma.user.deleteMany({ where: { id: session.userId } });
}

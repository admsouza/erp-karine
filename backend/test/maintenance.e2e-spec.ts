import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

async function sessaoComPerfil(
  app: INestApplication,
  role: 'ADMIN' | 'USER',
  rotulo: string,
): Promise<TestSession> {
  const prisma = app.get(PrismaService);
  const email = `${rotulo}.${Math.random().toString(36).slice(2, 8)}@teste.local`;
  const password = 'SenhaE2e123';
  const user = await prisma.user.create({
    data: {
      name: `Perfil ${role}`,
      email,
      passwordHash: await bcrypt.hash(password, 4),
      role,
    },
  });
  const resposta = await request(app.getHttpServer())
    .post('/api/auth/login')
    .send({ email, password })
    .expect(200);
  const cookie = (resposta.headers['set-cookie'] as unknown as string[])[0].split(
    ';',
  )[0];
  return { userId: user.id, email, password, cookie };
}

describe('Manutenção de cadastros (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let admin: TestSession;
  let comum: TestSession;
  const sufixo = Math.random().toString(36).slice(2, 8);
  let clienteId: string;
  let localId: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    admin = await createSession(app, 'manutencao.admin');
    comum = await sessaoComPerfil(app, 'USER', 'manutencao.comum');
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({
      where: {
        OR: [
          { actorUserId: admin.userId },
          { actorUserId: comum.userId },
        ],
      },
    });
    if (clienteId) await prisma.client.delete({ where: { id: clienteId } });
    if (localId)
      await prisma.resourceAccount.delete({ where: { id: localId } });
    await destroySession(app, comum);
    await destroySession(app, admin);
    await app.close();
  });

  it('exige ADMIN: o perfil comum recebe 403', async () => {
    await request(app.getHttpServer())
      .get('/api/maintenance/registrations?type=CLIENT')
      .set('Cookie', comum.cookie)
      .expect(403);
    await request(app.getHttpServer())
      .get('/api/maintenance/registrations?type=CLIENT')
      .expect(401);
  });

  it('lista cadastros por tipo com rótulo e detalhe legíveis', async () => {
    const cliente = await request(app.getHttpServer())
      .post('/api/clients')
      .set('Cookie', admin.cookie)
      .send({ fullName: `Cliente Manutenção ${sufixo}`, phone: '(83) 98888-1111' })
      .expect(201);
    clienteId = cliente.body.id;
    const local = await request(app.getHttpServer())
      .post('/api/financial/accounts')
      .set('Cookie', admin.cookie)
      .send({ name: `Local Manutenção ${sufixo}`, kind: 'BANK' })
      .expect(201);
    localId = local.body.id;

    const clientes = await request(app.getHttpServer())
      .get(`/api/maintenance/registrations?type=CLIENT&search=Manutenção ${sufixo}`)
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(clientes.body.items).toEqual([
      expect.objectContaining({
        id: clienteId,
        type: 'CLIENT',
        label: `Cliente Manutenção ${sufixo}`,
        secondary: '(83) 98888-1111',
        active: true,
      }),
    ]);

    const locais = await request(app.getHttpServer())
      .get(`/api/maintenance/registrations?type=RESOURCE_ACCOUNT&search=${sufixo}`)
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(locais.body.items).toEqual([
      expect.objectContaining({
        id: localId,
        type: 'RESOURCE_ACCOUNT',
        secondary: 'Banco',
        active: true,
      }),
    ]);

    // Situação como texto e tipo inválido
    const inativos = await request(app.getHttpServer())
      .get(`/api/maintenance/registrations?type=CLIENT&search=Manutenção ${sufixo}&active=false`)
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(inativos.body.items).toEqual([]);
    await request(app.getHttpServer())
      .get('/api/maintenance/registrations?type=INEXISTENTE')
      .set('Cookie', admin.cookie)
      .expect(400);
  });

  it('resume as contagens por tipo (para o seletor não abrir em tipo vazio)', async () => {
    const resumo = await request(app.getHttpServer())
      .get('/api/maintenance/summary')
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(Object.keys(resumo.body.counts).sort()).toEqual([
      'CLIENT',
      'PROCEDURE',
      'RESOURCE_ACCOUNT',
      'SUBSCRIPTION_PLAN',
    ]);
    expect(resumo.body.counts.CLIENT).toBeGreaterThanOrEqual(1);
    expect(resumo.body.counts.RESOURCE_ACCOUNT).toBeGreaterThanOrEqual(1);
    await request(app.getHttpServer())
      .get('/api/maintenance/summary')
      .set('Cookie', comum.cookie)
      .expect(403);
  });

  it('edita o cliente pelo hub e registra a trilha (o dono não registra)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/maintenance/registrations/CLIENT/${clienteId}`)
      .set('Cookie', admin.cookie)
      .send({ name: `Cliente Manutenção ${sufixo} editado`, phone: '(83) 97777-2222' })
      .expect(200);
    const atualizado = await prisma.client.findUniqueOrThrow({
      where: { id: clienteId },
    });
    expect(atualizado.fullName).toBe(`Cliente Manutenção ${sufixo} editado`);
    expect(atualizado.phone).toBe('(83) 97777-2222');
    const eventos = await prisma.auditEvent.findMany({
      where: { entityType: 'Client', entityId: clienteId, module: 'maintenance' },
    });
    expect(eventos).toHaveLength(1);
    expect(eventos[0].action).toBe('UPDATED');
    expect(eventos[0].changes).toEqual([
      {
        field: 'fullName',
        before: `Cliente Manutenção ${sufixo}`,
        after: `Cliente Manutenção ${sufixo} editado`,
      },
      { field: 'phone', before: '(83) 98888-1111', after: '(83) 97777-2222' },
    ]);
    // Edição sem campo aplicável e nome repetido
    await request(app.getHttpServer())
      .patch(`/api/maintenance/registrations/CLIENT/${clienteId}`)
      .set('Cookie', admin.cookie)
      .send({ priceCents: 100 })
      .expect(400);
  });

  it('edita o local do recurso sem duplicar a trilha do módulo dono', async () => {
    await request(app.getHttpServer())
      .patch(`/api/maintenance/registrations/RESOURCE_ACCOUNT/${localId}`)
      .set('Cookie', admin.cookie)
      .send({ name: `Local Manutenção ${sufixo} renomeado`, kind: 'CARD' })
      .expect(200);
    const local = await prisma.resourceAccount.findUniqueOrThrow({
      where: { id: localId },
    });
    expect(local.name).toBe(`Local Manutenção ${sufixo} renomeado`);
    expect(local.kind).toBe('CARD');
    const doDono = await prisma.auditEvent.count({
      where: { entityType: 'ResourceAccount', entityId: localId, module: 'financial' },
    });
    const doHub = await prisma.auditEvent.count({
      where: { entityType: 'ResourceAccount', entityId: localId, module: 'maintenance' },
    });
    expect(doDono).toBe(2); // criação + edição, gravadas pelo módulo dono
    expect(doHub).toBe(0);
  });

  it('inativa e reativa o cliente pelo hub com trilha', async () => {
    await request(app.getHttpServer())
      .patch(`/api/maintenance/registrations/CLIENT/${clienteId}/inactivate`)
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(
      (await prisma.client.findUniqueOrThrow({ where: { id: clienteId } })).active,
    ).toBe(false);
    await request(app.getHttpServer())
      .patch(`/api/maintenance/registrations/CLIENT/${clienteId}/inactivate`)
      .set('Cookie', admin.cookie)
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/maintenance/registrations/CLIENT/${clienteId}/reactivate`)
      .set('Cookie', admin.cookie)
      .expect(200);
    expect(
      (await prisma.client.findUniqueOrThrow({ where: { id: clienteId } })).active,
    ).toBe(true);
    const eventos = await prisma.auditEvent.findMany({
      where: { entityId: clienteId, module: 'maintenance' },
      orderBy: { createdAt: 'asc' },
    });
    expect(eventos.map((x) => x.action)).toEqual([
      'UPDATED',
      'INACTIVATED',
      'REACTIVATED',
    ]);
    await request(app.getHttpServer())
      .delete(`/api/maintenance/registrations/CLIENT/${clienteId}`)
      .set('Cookie', admin.cookie)
      .expect(404);
  });
});

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

/** Sessão com um perfil específico (o helper padrão cria ADMIN). */
async function sessaoComPerfil(app: INestApplication, role: 'ADMIN' | 'USER', rotulo: string): Promise<TestSession> {
  const prisma = app.get(PrismaService);
  const email = `${rotulo}.${Math.random().toString(36).slice(2, 8)}@teste.local`;
  const password = 'SenhaE2e123';
  const user = await prisma.user.create({
    data: { name: `Perfil ${role}`, email, passwordHash: await bcrypt.hash(password, 4), role },
  });
  const resposta = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);
  const cookie = (resposta.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
  return { userId: user.id, email, password, cookie };
}

describe('Auditoria do sistema (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  let admin: TestSession; let comum: TestSession;
  let outraAtorId = '';
  const criados: string[] = [];
  const fixtureEntityId = crypto.randomUUID();

  async function registrarEvento(dados: { actorUserId: string; actorName: string; reason: string; createdAt: Date; action?: string; module?: string; entityType?: string }) {
    const evento = await prisma.auditEvent.create({
      data: {
        actorUserId: dados.actorUserId,
        actorName: dados.actorName,
        actorEmail: `${dados.actorName.toLowerCase()}@teste.local`,
        module: dados.module ?? 'subscriptions',
        entityType: dados.entityType ?? 'SubscriptionPayment',
        entityId: fixtureEntityId,
        action: dados.action ?? 'UPDATED',
        reason: dados.reason,
        changes: [{ field: 'amountCents', before: 1000, after: 2000 }],
        createdAt: dados.createdAt,
      },
    });
    criados.push(evento.id);
    return evento;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    prisma = app.get(PrismaService);
    admin = await createSession(app, 'auditoria.admin');
    comum = await sessaoComPerfil(app, 'USER', 'auditoria.comum');
    outraAtorId = comum.userId;

    // Dois eventos: um do admin (12/09 às 23h de Recife) e um do usuário comum (13/09).
    await registrarEvento({ actorUserId: admin.userId, actorName: 'Admin Auditoria', reason: 'Correção de valor', createdAt: new Date('2026-09-13T02:00:00Z') });
    await registrarEvento({ actorUserId: outraAtorId, actorName: 'Usuário Comum', reason: 'Ajuste de observação', createdAt: new Date('2026-09-13T15:00:00Z'), module: 'clients', entityType: 'Client', action: 'UPDATED' });
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({ where: { id: { in: criados } } });
    await destroySession(app, comum);
    await destroySession(app, admin);
    await app.close();
  });

  it('lista a trilha para ADMIN', async () => {
    const resposta = await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ page: 1, pageSize: 50 }).expect(200);
    expect(resposta.body).toMatchObject({ page: 1, pageSize: 50 });
    expect(resposta.body.total).toBeGreaterThanOrEqual(2);
    // Outras suítes rodam em paralelo no mesmo banco e alimentam a trilha, então o evento desta
    // execução pode não caber na primeira página: localize-o pelo motivo único.
    const filtrada = await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ page: 1, pageSize: 50, search: 'Correção de valor' }).expect(200);
    const motivo = filtrada.body.items.find((item: { reason: string }) => item.reason === 'Correção de valor');
    expect(motivo).toMatchObject({ actorName: 'Admin Auditoria', action: 'UPDATED', entityType: 'SubscriptionPayment' });
    expect(motivo.changes).toEqual([{ field: 'amountCents', before: 1000, after: 2000 }]);
  });

  it('filtra por autor, módulo, tipo, ação e busca livre', async () => {
    const porAutor = await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ actorUserId: outraAtorId }).expect(200);
    expect(porAutor.body.total).toBe(1);
    expect(porAutor.body.items[0]).toMatchObject({ actorName: 'Usuário Comum', module: 'clients', entityType: 'Client' });

    const porModulo = await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ module: 'clients', entityType: 'Client', action: 'UPDATED' }).expect(200);
    expect(porModulo.body.total).toBe(1);

    const busca = await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ search: 'observação' }).expect(200);
    expect(busca.body.total).toBe(1);
    expect(busca.body.items[0].actorName).toBe('Usuário Comum');
  });

  it('filtra por período no fuso da clínica (America/Recife)', async () => {
    // 2026-09-13T02:00Z é 12/09 às 23h em Recife: fica fora do dia 13 e dentro do dia 12.
    const dia13 = await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ search: fixtureEntityId, from: '2026-09-13', to: '2026-09-13' }).expect(200);
    expect(dia13.body.total).toBe(1);
    expect(dia13.body.items[0].actorName).toBe('Usuário Comum');

    const dia12 = await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ search: fixtureEntityId, from: '2026-09-12', to: '2026-09-12' }).expect(200);
    expect(dia12.body.total).toBe(1);
    expect(dia12.body.items[0].actorName).toBe('Admin Auditoria');
  });

  it('devolve as opções de filtro a partir do que já foi registrado', async () => {
    const resposta = await request(app.getHttpServer()).get('/api/audit/filters').set('Cookie', admin.cookie).expect(200);
    expect(resposta.body.actors).toEqual(expect.arrayContaining([expect.objectContaining({ id: outraAtorId, name: 'Usuário Comum' })]));
    expect(resposta.body.modules).toEqual(expect.arrayContaining(['subscriptions', 'clients']));
    expect(resposta.body.entityTypes).toEqual(expect.arrayContaining(['SubscriptionPayment', 'Client']));
    expect(resposta.body.actions).toEqual(expect.arrayContaining(['UPDATED']));
  });

  it('recusa o perfil USER com 403 e a rota sem sessão com 401', async () => {
    await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', comum.cookie).expect(403);
    await request(app.getHttpServer()).get('/api/audit/filters').set('Cookie', comum.cookie).expect(403);
    await request(app.getHttpServer()).get('/api/audit/events').expect(401);
  });

  it('valida a entrada da consulta', async () => {
    await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ page: 0 }).expect(400);
    await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ from: '13/09/2026' }).expect(400);
    await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ actorUserId: 'nao-e-uuid' }).expect(400);
    await request(app.getHttpServer()).get('/api/audit/events').set('Cookie', admin.cookie).query({ page: 1, pageSize: 50, module: 'subscriptions' }).expect(200);
  });

  it('não expõe rota de edição ou exclusão da trilha', async () => {
    await request(app.getHttpServer()).patch('/api/audit/events/00000000-0000-0000-0000-0000000000aa').set('Cookie', admin.cookie).send({ reason: 'tentativa' }).expect(404);
    await request(app.getHttpServer()).delete('/api/audit/events/00000000-0000-0000-0000-0000000000aa').set('Cookie', admin.cookie).expect(404);
  });
});

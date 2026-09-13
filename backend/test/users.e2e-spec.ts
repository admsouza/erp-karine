import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

describe('Administração de usuários (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService;
  let admin: TestSession; let comum: TestSession;
  let criadoId = '';
  const token = Math.random().toString(36).slice(2, 7);
  const emailCriado = `novo.${token}@teste.local`;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    prisma = app.get(PrismaService);
    admin = await createSession(app, 'usuarios.admin');
    // Sessão sem perfil de administrador, para conferir o 403.
    const emailComum = `comum.${token}@teste.local`;
    const senhaComum = 'SenhaE2e123';
    await prisma.user.create({ data: { name: 'Usuário Comum', email: emailComum, passwordHash: await bcrypt.hash(senhaComum, 4), role: 'USER' } });
    const resposta = await request(app.getHttpServer()).post('/api/auth/login').send({ email: emailComum, password: senhaComum }).expect(200);
    comum = { userId: '', email: emailComum, password: senhaComum, cookie: (resposta.headers['set-cookie'] as unknown as string[])[0].split(';')[0] };
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { contains: `.${token}@teste.local` } } });
    await prisma.auditEvent.deleteMany({ where: { entityType: 'User' } });
    await destroySession(app, admin);
    await app.close();
  });

  it('cria usuário com senha inicial e troca obrigatória', async () => {
    const resposta = await request(app.getHttpServer()).post('/api/users').set('Cookie', admin.cookie)
      .send({ name: 'Usuário Novo', email: emailCriado, password: 'Inicial123', role: 'USER' })
      .expect(201);
    criadoId = resposta.body.id;
    expect(resposta.body).toMatchObject({ name: 'Usuário Novo', email: emailCriado, role: 'USER', active: true, mustChangePassword: true });
    expect(resposta.body).not.toHaveProperty('passwordHash');

    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email: emailCriado, password: 'Inicial123' }).expect(200);
    expect(login.body.user.mustChangePassword).toBe(true);
  });

  it('valida entrada e impede e-mail repetido', async () => {
    await request(app.getHttpServer()).post('/api/users').set('Cookie', admin.cookie).send({ name: 'Fulano Repetido', email: emailCriado, password: 'Inicial123', role: 'USER' }).expect(409);
    await request(app.getHttpServer()).post('/api/users').set('Cookie', admin.cookie).send({ name: 'Fulano', email: `fraco.${token}@teste.local`, password: 'senhasemnumero', role: 'USER' }).expect(400);
    await request(app.getHttpServer()).post('/api/users').set('Cookie', admin.cookie).send({ name: 'Fulano', email: `perfil.${token}@teste.local`, password: 'Senha12345', role: 'SUPER' }).expect(400);
    await request(app.getHttpServer()).post('/api/users').set('Cookie', admin.cookie).send({ name: 'Fulano', email: 'nao-e-email', password: 'Senha12345', role: 'USER' }).expect(400);
  });

  it('lista com busca, filtro de perfil e situação', async () => {
    const porBusca = await request(app.getHttpServer()).get('/api/users').set('Cookie', admin.cookie).query({ search: emailCriado, page: 1, pageSize: 20 }).expect(200);
    expect(porBusca.body).toMatchObject({ page: 1, pageSize: 20 });
    expect(porBusca.body.items).toHaveLength(1);
    expect(porBusca.body.items[0]).not.toHaveProperty('passwordHash');

    const porPerfil = await request(app.getHttpServer()).get('/api/users').set('Cookie', admin.cookie).query({ role: 'USER', active: 'true' }).expect(200);
    expect(porPerfil.body.items.every((item: { role: string; active: boolean }) => item.role === 'USER' && item.active)).toBe(true);

    await request(app.getHttpServer()).get('/api/users').set('Cookie', admin.cookie).query({ active: 'talvez' }).expect(400);
    await request(app.getHttpServer()).get('/api/users').set('Cookie', admin.cookie).query({ page: 0 }).expect(400);
  });

  it('troca o perfil do usuário', async () => {
    const resposta = await request(app.getHttpServer()).patch(`/api/users/${criadoId}/role`).set('Cookie', admin.cookie).send({ role: 'ADMIN' }).expect(200);
    expect(resposta.body.role).toBe('ADMIN');
    await request(app.getHttpServer()).patch(`/api/users/${criadoId}/role`).set('Cookie', admin.cookie).send({ role: 'ADMIN' }).expect(400);
    await request(app.getHttpServer()).patch(`/api/users/${criadoId}/role`).set('Cookie', admin.cookie).send({ role: 'SUPER' }).expect(400);
  });

  it('redefine a senha forçando a troca e derrubando as sessões (sem registrar a senha)', async () => {
    await request(app.getHttpServer()).post(`/api/users/${criadoId}/password`).set('Cookie', admin.cookie).send({ password: 'NovoSenha123' }).expect(201);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: emailCriado, password: 'Inicial123' }).expect(401);
    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email: emailCriado, password: 'NovoSenha123' }).expect(200);
    expect(login.body.user.mustChangePassword).toBe(true);

    const evento = await prisma.auditEvent.findFirst({ where: { entityType: 'User', entityId: criadoId, actorUserId: admin.userId }, orderBy: { createdAt: 'desc' } });
    expect(JSON.stringify(evento?.changes)).not.toContain('NovoSenha123');
  });

  it('inativa (derrubando sessões) e reativa o usuário', async () => {
    const inativado = await request(app.getHttpServer()).patch(`/api/users/${criadoId}/inactivate`).set('Cookie', admin.cookie).expect(200);
    expect(inativado.body).toMatchObject({ active: false });
    await request(app.getHttpServer()).patch(`/api/users/${criadoId}/inactivate`).set('Cookie', admin.cookie).expect(400);
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: emailCriado, password: 'NovoSenha123' }).expect(401);

    const reativado = await request(app.getHttpServer()).patch(`/api/users/${criadoId}/reactivate`).set('Cookie', admin.cookie).expect(200);
    expect(reativado.body).toMatchObject({ active: true });
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: emailCriado, password: 'NovoSenha123' }).expect(200);
  });

  it('protege o próprio administrador', async () => {
    await request(app.getHttpServer()).patch(`/api/users/${admin.userId}/inactivate`).set('Cookie', admin.cookie).expect(400);
    await request(app.getHttpServer()).patch(`/api/users/${admin.userId}/role`).set('Cookie', admin.cookie).send({ role: 'USER' }).expect(400);
  });

  it('recusa perfil não administrador e exige sessão', async () => {
    await request(app.getHttpServer()).get('/api/users').set('Cookie', comum.cookie).expect(403);
    await request(app.getHttpServer()).post('/api/users').set('Cookie', comum.cookie).send({ name: 'Fulano', email: `bloqueado.${token}@teste.local`, password: 'Senha12345', role: 'USER' }).expect(403);
    await request(app.getHttpServer()).get('/api/users').expect(401);
  });

  it('não expõe exclusão física de usuário', async () => {
    await request(app.getHttpServer()).delete(`/api/users/${criadoId}`).set('Cookie', admin.cookie).expect(404);
  });
});

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/common/database/prisma.service.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

describe('Módulo de procedimentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessao: TestSession;
  const runToken = Math.random().toString(36).slice(2, 8);
  const nome = (sufixo: string) => `Procedimento E2E ${runToken} ${sufixo}`;
  const criados: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    sessao = await createSession(app, 'procedures');
  });

  afterAll(async () => {
    await prisma.procedure.deleteMany({ where: { id: { in: criados } } });
    await destroySession(app, sessao);
    await app.close();
  });

  it('exige sessão', async () => {
    await request(app.getHttpServer()).get('/api/procedures').expect(401);
  });

  it('cadastra, pesquisa, edita, inativa e reativa', async () => {
    const criado = await request(app.getHttpServer())
      .post('/api/procedures')
      .set('Cookie', sessao.cookie)
      .send({ name: nome('Limpeza'), description: 'Higienização profunda', durationMinutes: 60, defaultValueCents: 18000 })
      .expect(201);

    criados.push(criado.body.id);
    expect(criado.body).toMatchObject({ name: nome('Limpeza'), durationMinutes: 60, defaultValueCents: 18000, active: true });
    expect(criado.body).not.toHaveProperty('deletedAt');

    const busca = await request(app.getHttpServer())
      .get('/api/procedures')
      .query({ search: `Procedimento E2E ${runToken}` })
      .set('Cookie', sessao.cookie)
      .expect(200);
    expect(busca.body.total).toBeGreaterThanOrEqual(1);
    expect(busca.body.items.some((p: { id: string }) => p.id === criado.body.id)).toBe(true);

    const editado = await request(app.getHttpServer())
      .patch(`/api/procedures/${criado.body.id}`)
      .set('Cookie', sessao.cookie)
      .send({ defaultValueCents: 20000 })
      .expect(200);
    expect(editado.body.defaultValueCents).toBe(20000);
    expect(editado.body.name).toBe(nome('Limpeza'));

    const inativado = await request(app.getHttpServer())
      .patch(`/api/procedures/${criado.body.id}/inactivate`)
      .set('Cookie', sessao.cookie)
      .expect(200);
    expect(inativado.body.active).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/procedures/${criado.body.id}/inactivate`)
      .set('Cookie', sessao.cookie)
      .expect(409);

    const inativos = await request(app.getHttpServer())
      .get('/api/procedures')
      .query({ search: `Procedimento E2E ${runToken}`, active: 'false' })
      .set('Cookie', sessao.cookie)
      .expect(200);
    expect(inativos.body.items.some((p: { id: string }) => p.id === criado.body.id)).toBe(true);

    const ativos = await request(app.getHttpServer())
      .get('/api/procedures')
      .query({ search: `Procedimento E2E ${runToken}`, active: 'true' })
      .set('Cookie', sessao.cookie)
      .expect(200);
    expect(ativos.body.items.some((p: { id: string }) => p.id === criado.body.id)).toBe(false);

    const reativado = await request(app.getHttpServer())
      .patch(`/api/procedures/${criado.body.id}/reactivate`)
      .set('Cookie', sessao.cookie)
      .expect(200);
    expect(reativado.body.active).toBe(true);

    const detalhe = await request(app.getHttpServer())
      .get(`/api/procedures/${criado.body.id}`)
      .set('Cookie', sessao.cookie)
      .expect(200);
    expect(detalhe.body.description).toBe('Higienização profunda');
  });

  it('recusa nome duplicado com 409', async () => {
    await request(app.getHttpServer())
      .post('/api/procedures')
      .set('Cookie', sessao.cookie)
      .send({ name: nome('Duplicado') })
      .expect(201)
      .then((resposta) => criados.push(resposta.body.id));

    const duplicado = await request(app.getHttpServer())
      .post('/api/procedures')
      .set('Cookie', sessao.cookie)
      .send({ name: nome('Duplicado') })
      .expect(409);
    expect(duplicado.body.message).toContain('procedimento');
  });

  it('valida payload com 400', async () => {
    await request(app.getHttpServer())
      .post('/api/procedures')
      .set('Cookie', sessao.cookie)
      .send({ name: 'ab' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/procedures')
      .set('Cookie', sessao.cookie)
      .send({ name: nome('DuracaoInvalida'), durationMinutes: 2 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/procedures')
      .set('Cookie', sessao.cookie)
      .send({ name: nome('ValorInvalido'), defaultValueCents: 10.5 })
      .expect(400);

    await request(app.getHttpServer())
      .get('/api/procedures/nao-e-uuid')
      .set('Cookie', sessao.cookie)
      .expect(400);
  });

  it('responde 404 para procedimento inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/procedures/00000000-0000-4000-8000-000000000000')
      .set('Cookie', sessao.cookie)
      .expect(404);
  });
});

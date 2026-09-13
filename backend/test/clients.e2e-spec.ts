import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from './../src/common/database/prisma.service.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

/** Gera um CPF válido aleatório para não colidir com dados já existentes. */
function randomValidCpf(): string {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const checkDigit = (partial: number[]): number => {
    const sum = partial.reduce((total, digit, index) => total + digit * (partial.length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  digits.push(checkDigit(digits));
  digits.push(checkDigit(digits));
  return digits.join('');
}

describe('Módulo de clientes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let sessao: TestSession;
  const createdIds: string[] = [];
  // Sufixo único por execução: evita colisão com dados de execuções anteriores.
  const runToken = Math.random().toString(36).slice(2, 8).toUpperCase();
  const clientName = `Cliente E2E ${runToken}`;
  const cpf = randomValidCpf();
  const cpfDuplicado = randomValidCpf();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    sessao = await createSession(app, 'clients');
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.client.deleteMany({ where: { id: { in: createdIds } } });
    }
    await destroySession(app, sessao);
    await app.close();
  });

  it('cadastra, pesquisa, edita, inativa e reativa um cliente', async () => {
    const created = await request(app.getHttpServer()).post('/api/clients').set('Cookie', sessao.cookie)
      .send({
        fullName: clientName,
        cpf: cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
        birthDate: '1990-05-20',
        phone: '(83) 99999-0000',
        email: 'cliente.e2e@email.com',
      })
      .expect(201);

    createdIds.push(created.body.id);
    expect(created.body).toMatchObject({ fullName: clientName, cpf, active: true });

    const listed = await request(app.getHttpServer()).get('/api/clients').set('Cookie', sessao.cookie)
      .query({ search: runToken })
      .expect(200);

    expect(listed.body.total).toBeGreaterThanOrEqual(1);
    expect(listed.body.items.map((item: { id: string }) => item.id)).toContain(created.body.id);

    const detailed = await request(app.getHttpServer()).get(`/api/clients/${created.body.id}`).set('Cookie', sessao.cookie)
      .expect(200);
    expect(detailed.body.email).toBe('cliente.e2e@email.com');

    const updated = await request(app.getHttpServer()).patch(`/api/clients/${created.body.id}`).set('Cookie', sessao.cookie)
      .send({ notes: 'Paciente com histórico de alergia.' })
      .expect(200);
    expect(updated.body.notes).toBe('Paciente com histórico de alergia.');

    const inactivated = await request(app.getHttpServer()).patch(`/api/clients/${created.body.id}/inactivate`).set('Cookie', sessao.cookie)
      .expect(200);
    expect(inactivated.body).toMatchObject({ active: false });
    expect(inactivated.body.deactivatedAt).not.toBeNull();

    const actives = await request(app.getHttpServer()).get('/api/clients').set('Cookie', sessao.cookie)
      .query({ search: runToken, active: 'true' })
      .expect(200);
    expect(actives.body.items).toHaveLength(0);

    const inactives = await request(app.getHttpServer()).get('/api/clients').set('Cookie', sessao.cookie)
      .query({ search: runToken, active: 'false' })
      .expect(200);
    expect(inactives.body.total).toBeGreaterThanOrEqual(1);

    const reactivated = await request(app.getHttpServer()).patch(`/api/clients/${created.body.id}/reactivate`).set('Cookie', sessao.cookie)
      .expect(200);
    expect(reactivated.body).toMatchObject({ active: true, deactivatedAt: null });

    await request(app.getHttpServer()).patch(`/api/clients/${created.body.id}/inactivate`).set('Cookie', sessao.cookie)
      .expect(200);
  });

  it('recusa CPF duplicado com 409', async () => {
    const first = await request(app.getHttpServer()).post('/api/clients').set('Cookie', sessao.cookie)
      .send({ fullName: `Cliente Duplicado ${runToken}`, cpf: cpfDuplicado })
      .expect(201);
    createdIds.push(first.body.id);

    const response = await request(app.getHttpServer()).post('/api/clients').set('Cookie', sessao.cookie)
      .send({ fullName: `Outro Cliente ${runToken}`, cpf: cpfDuplicado })
      .expect(409);

    expect(response.body.message).toContain('CPF');
  });

  it('recusa payload inválido com 400 (CPF, e-mail e campo desconhecido)', async () => {
    const invalidCpf = await request(app.getHttpServer()).post('/api/clients').set('Cookie', sessao.cookie)
      .send({ fullName: 'Cliente', cpf: '111.111.111-11' })
      .expect(400);
    expect(invalidCpf.body.message.join(' ')).toContain('CPF');

    await request(app.getHttpServer()).post('/api/clients').set('Cookie', sessao.cookie)
      .send({ fullName: 'Cliente', email: 'nao-e-email' })
      .expect(400);

    await request(app.getHttpServer()).post('/api/clients').set('Cookie', sessao.cookie)
      .send({ fullName: 'Cliente', campoInexistente: 'x' })
      .expect(400);
  });

  it('responde 404 para cliente inexistente e 400 para id malformado', async () => {
    await request(app.getHttpServer()).get('/api/clients/00000000-0000-4000-8000-000000000000').set('Cookie', sessao.cookie)
      .expect(404);

    await request(app.getHttpServer()).get('/api/clients/nao-e-uuid').set('Cookie', sessao.cookie).expect(400);
  });
});

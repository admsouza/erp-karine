import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

describe('Módulo de assinaturas (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let session: TestSession;
  let clientId = ''; let planId = ''; let subscriptionId = ''; let paymentId = '';
  const token = Math.random().toString(36).slice(2, 9);
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init();
    prisma = app.get(PrismaService); session = await createSession(app, 'subscriptions');
    clientId = (await prisma.client.create({ data: { fullName: `Cliente Assinatura ${token}` } })).id;
  });
  afterAll(async () => {
    if (subscriptionId) await prisma.subscriptionPayment.deleteMany({ where: { subscriptionId } });
    if (subscriptionId) await prisma.clientSubscription.deleteMany({ where: { id: subscriptionId } });
    if (planId) await prisma.subscriptionPlan.deleteMany({ where: { id: planId } });
    if (clientId) await prisma.client.deleteMany({ where: { id: clientId } });
    await destroySession(app, session); await app.close();
  });

  it('cria plano e valida payload monetário e periodicidade', async () => {
    const response = await request(app.getHttpServer()).post('/api/subscription-plans').set('Cookie', session.cookie).send({ name: `Plano ${token}`, priceCents: 9900, periodicity: 'MENSAL', sessionsPerPeriod: 2 }).expect(201);
    planId = response.body.id; expect(response.body).toMatchObject({ priceCents: 9900, periodicity: 'MENSAL', active: true });
    await request(app.getHttpServer()).post('/api/subscription-plans').set('Cookie', session.cookie).send({ name: 'X', priceCents: 10.5, periodicity: 'INVALIDA' }).expect(400);
  });

  it('contrata com snapshot e impede duplicidade ativa', async () => {
    const response = await request(app.getHttpServer()).post('/api/subscriptions').set('Cookie', session.cookie).send({ clientId, planId, startDate: '2026-09-13', paymentMethod: 'PIX' }).expect(201);
    subscriptionId = response.body.id;
    expect(response.body).toMatchObject({ planName: `Plano ${token}`, planPeriodicity: 'MENSAL', planSessionsPerPeriod: 2, contractedValueCents: 9900, status: 'ATIVA' });
    await request(app.getHttpServer()).post('/api/subscriptions').set('Cookie', session.cookie).send({ clientId, planId, startDate: '2026-09-13', paymentMethod: 'PIX' }).expect(409);
  });

  it('registra e lista pagamento e filtra assinatura', async () => {
    const paid = await request(app.getHttpServer()).post(`/api/subscriptions/${subscriptionId}/payments`).set('Cookie', session.cookie).send({ amountCents: 9900, paidAt: '2026-09-13T12:00:00-03:00', paymentMethod: 'CARTAO_CREDITO' }).expect(201);
    paymentId = paid.body.id; expect(paymentId).toBeTruthy();
    const payments = await request(app.getHttpServer()).get(`/api/subscriptions/${subscriptionId}/payments`).set('Cookie', session.cookie).expect(200);
    expect(payments.body.some((item: { id: string }) => item.id === paymentId)).toBe(true);
    const list = await request(app.getHttpServer()).get('/api/subscriptions').query({ clientId, status: 'ATIVA' }).set('Cookie', session.cookie).expect(200);
    expect(list.body[0]).toMatchObject({ id: subscriptionId, clientName: `Cliente Assinatura ${token}` });
  });

  it('controla inadimplência, retorno à ativa e encerramento sem exclusão', async () => {
    for (const status of ['INADIMPLENTE', 'ATIVA', 'ENCERRADA']) await request(app.getHttpServer()).patch(`/api/subscriptions/${subscriptionId}/status`).set('Cookie', session.cookie).send({ status }).expect(200);
    await request(app.getHttpServer()).post(`/api/subscriptions/${subscriptionId}/payments`).set('Cookie', session.cookie).send({ amountCents: 1, paidAt: '2026-09-13', paymentMethod: 'PIX' }).expect(409);
  });
});

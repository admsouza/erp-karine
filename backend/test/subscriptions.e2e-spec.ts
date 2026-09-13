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
    if (subscriptionId) await prisma.financialTransaction.deleteMany({ where: { subscriptionId } });
    if (subscriptionId) await prisma.auditEvent.deleteMany({ where: { entityType: 'SubscriptionPayment', entityId: paymentId } });
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

  it('exige motivo da alteração e recusa edição sem mudança efetiva', async () => {
    const url = `/api/subscriptions/${subscriptionId}/payments/${paymentId}`;
    await request(app.getHttpServer()).patch(url).set('Cookie', session.cookie).send({ amountCents: 10900, paidAt: '2026-09-13T12:00:00-03:00', paymentMethod: 'CARTAO_CREDITO' }).expect(400);
    await request(app.getHttpServer()).patch(url).set('Cookie', session.cookie).send({ amountCents: 9900, paidAt: '2026-09-13T12:00:00-03:00', paymentMethod: 'CARTAO_CREDITO', notes: '', reason: 'Conferência' }).expect(400);
  });

  it('edita o pagamento auditando autor, motivo e só os campos alterados, e sincroniza o financeiro sem duplicar', async () => {
    const url = `/api/subscriptions/${subscriptionId}/payments/${paymentId}`;
    const vinculado = await prisma.financialTransaction.findMany({ where: { subscriptionPaymentId: paymentId } });
    expect(vinculado).toHaveLength(1);
    expect(vinculado[0]).toMatchObject({ amountCents: 9900, paymentMethod: 'CARTAO_CREDITO' });

    const response = await request(app.getHttpServer()).patch(url).set('Cookie', session.cookie).set('x-request-id', 'e2e-pagamento-1')
      .send({ amountCents: 10900, paidAt: '2026-09-13T12:00:00-03:00', paymentMethod: 'PIX', notes: 'Parcela corrigida', reason: 'Corrigi valor e forma' })
      .expect(200);
    expect(response.body).toMatchObject({ id: paymentId, amountCents: 10900, paymentMethod: 'PIX', notes: 'Parcela corrigida' });

    const sincronizado = await prisma.financialTransaction.findMany({ where: { subscriptionPaymentId: paymentId } });
    expect(sincronizado).toHaveLength(1);
    expect(sincronizado[0]).toMatchObject({ amountCents: 10900, paymentMethod: 'PIX', status: 'PAGO' });

    const timeline = await request(app.getHttpServer()).get(`${url}/timeline`).set('Cookie', session.cookie).query({ page: 1, pageSize: 50 }).expect(200);
    expect(timeline.body.total).toBe(1);
    expect(timeline.body.items[0]).toMatchObject({
      actorUserId: session.userId, actorName: 'Usuário de teste', actorEmail: session.email,
      module: 'subscriptions', entityType: 'SubscriptionPayment', entityId: paymentId,
      action: 'UPDATED', requestId: 'e2e-pagamento-1', reason: 'Corrigi valor e forma',
    });
    expect(timeline.body.items[0].changes).toEqual([
      { field: 'amountCents', before: 9900, after: 10900 },
      { field: 'paymentMethod', before: 'CARTAO_CREDITO', after: 'PIX' },
      { field: 'notes', before: null, after: 'Parcela corrigida' },
    ]);
  });

  it('protege detalhe, edição e linha do tempo do pagamento sem sessão', async () => {
    const url = `/api/subscriptions/${subscriptionId}/payments/${paymentId}`;
    await request(app.getHttpServer()).get(url).expect(401);
    await request(app.getHttpServer()).get(`${url}/timeline`).expect(401);
    await request(app.getHttpServer()).patch(url).send({ amountCents: 1, paidAt: '2026-09-13', paymentMethod: 'PIX', reason: 'Sem sessão' }).expect(401);
    await request(app.getHttpServer()).get(`${url}/timeline`).set('Cookie', session.cookie).query({ page: 0 }).expect(400);
    // Paginação explícita via query string precisa funcionar: `?page=1&pageSize=50` chega como texto e
    // o DTO precisa converter com `@Type(() => Number)` (foi o que quebrou a timeline na UI real).
    const paginada = await request(app.getHttpServer()).get(`${url}/timeline`).set('Cookie', session.cookie).query({ page: 1, pageSize: 50 }).expect(200);
    expect(paginada.body).toMatchObject({ page: 1, pageSize: 50 });
  });

  it('controla inadimplência, retorno à ativa e encerramento sem exclusão', async () => {
    for (const status of ['INADIMPLENTE', 'ATIVA', 'ENCERRADA']) await request(app.getHttpServer()).patch(`/api/subscriptions/${subscriptionId}/status`).set('Cookie', session.cookie).send({ status }).expect(200);
    await request(app.getHttpServer()).post(`/api/subscriptions/${subscriptionId}/payments`).set('Cookie', session.cookie).send({ amountCents: 1, paidAt: '2026-09-13', paymentMethod: 'PIX' }).expect(409);
  });
});

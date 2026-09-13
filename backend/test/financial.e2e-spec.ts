import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

describe('Módulo financeiro (e2e)', () => {
  let app: INestApplication; let prisma: PrismaService; let session: TestSession;
  let clientId = ''; let procedureId = ''; let appointmentId = ''; let planId = ''; let subscriptionId = ''; let manualId = '';
  const token = Math.random().toString(36).slice(2, 9);
  const now = new Date();
  const testDate = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Recife'}).format(now);
  const tomorrowDate = new Date(`${testDate}T12:00:00-03:00`); tomorrowDate.setDate(tomorrowDate.getDate()+1);
  const nextDate = new Intl.DateTimeFormat('en-CA',{timeZone:'America/Recife'}).format(tomorrowDate);
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication(); configureApp(app); await app.init(); prisma = app.get(PrismaService); session = await createSession(app, 'financial');
    clientId = (await prisma.client.create({ data: { fullName: `Cliente Financeiro ${token}` } })).id;
    procedureId = (await prisma.procedure.create({ data: { name: `Procedimento Financeiro ${token}` } })).id;
    await prisma.procedurePrice.create({ data: { procedureId, valueCents: 30000, validFrom: new Date('2026-01-01') } });
    planId = (await prisma.subscriptionPlan.create({ data: { name: `Plano Financeiro ${token}`, priceCents: 15000 } })).id;
  });
  afterAll(async () => {
    await prisma.financialTransaction.deleteMany({ where: { clientId } });
    if (appointmentId) await prisma.appointment.deleteMany({ where: { id: appointmentId } });
    if (subscriptionId) await prisma.subscriptionPayment.deleteMany({ where: { subscriptionId } });
    if (subscriptionId) await prisma.clientSubscription.deleteMany({ where: { id: subscriptionId } });
    await prisma.procedurePrice.deleteMany({ where: { procedureId } }); await prisma.procedure.deleteMany({ where: { id: procedureId } });
    await prisma.subscriptionPlan.deleteMany({ where: { id: planId } }); await prisma.client.deleteMany({ where: { id: clientId } });
    await destroySession(app, session); await app.close();
  });
  it('gera uma única receita ao realizar atendimento e preserva snapshot', async () => {
    const created = await request(app.getHttpServer()).post('/api/appointments').set('Cookie', session.cookie).send({ clientId, procedureId, scheduledAt: `${testDate}T09:00:00-03:00` }).expect(201); appointmentId = created.body.id;
    await request(app.getHttpServer()).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', session.cookie).send({ status: 'CONFIRMADO' }).expect(200);
    await request(app.getHttpServer()).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', session.cookie).send({ status: 'REALIZADO' }).expect(200);
    const items = await prisma.financialTransaction.findMany({ where: { appointmentId } });
    expect(items).toHaveLength(1); expect(items[0]).toMatchObject({ procedureName: `Procedimento Financeiro ${token}`, amountCents: 30000, origin: 'APPOINTMENT', type: 'RECEITA' });
  });
  it('gera uma única receita ao registrar pagamento de assinatura', async () => {
    const subscribed = await request(app.getHttpServer()).post('/api/subscriptions').set('Cookie', session.cookie).send({ clientId, planId, startDate: testDate, paymentMethod: 'PIX' }).expect(201); subscriptionId = subscribed.body.id;
    const payment = await request(app.getHttpServer()).post(`/api/subscriptions/${subscriptionId}/payments`).set('Cookie', session.cookie).send({ amountCents: 15000, paidAt: `${testDate}T10:00:00-03:00`, paymentMethod: 'PIX' }).expect(201);
    const items = await prisma.financialTransaction.findMany({ where: { subscriptionPaymentId: payment.body.id } });
    expect(items).toHaveLength(1); expect(items[0]).toMatchObject({ subscriptionName: `Plano Financeiro ${token}`, amountCents: 15000, origin: 'SUBSCRIPTION' });
  });
  it('cria despesa manual, valida entrada e filtra por período/origem/tipo/status', async () => {
    const created = await request(app.getHttpServer()).post('/api/financial/transactions').set('Cookie', session.cookie).send({ clientId, description: `Material ${token}`, category: 'Insumos', amountCents: 5000, date: `${testDate}T11:00:00-03:00`, paymentMethod: 'PIX', type: 'DESPESA', status: 'PAGO' }).expect(201); manualId = created.body.id;
    await request(app.getHttpServer()).post('/api/financial/transactions').set('Cookie', session.cookie).send({ description: '', amountCents: 1.5, date: 'invalida', paymentMethod: 'INVALIDO', type: 'INVALIDO', status: 'PAGO', extra: true }).expect(400);
    const filtered = await request(app.getHttpServer()).get('/api/financial/transactions').query({ from: testDate, to: nextDate, origin: 'MANUAL', type: 'DESPESA', status: 'PAGO' }).set('Cookie', session.cookie).expect(200);
    expect(filtered.body.map((x: { id: string }) => x.id)).toContain(manualId);
  });
  it('recusa descrição vazia mesmo quando os demais campos são válidos', async () => {
    await request(app.getHttpServer()).post('/api/financial/transactions').set('Cookie', session.cookie).send({ description: '   ', amountCents: 100, date: testDate, paymentMethod: 'PIX', type: 'DESPESA', status: 'PAGO' }).expect(400);
  });
  it('calcula indicadores e relatórios por snapshots', async () => {
    const summary = await request(app.getHttpServer()).get('/api/financial/summary').query({ from: testDate, to: nextDate, clientId }).set('Cookie', session.cookie).expect(200);
    expect(summary.body).toMatchObject({ revenueCents: 45000, expenseCents: 5000, balanceCents: 40000, receiptCount: 2 });
    const reports = await request(app.getHttpServer()).get('/api/financial/reports').query({ from: testDate, to: nextDate, clientId }).set('Cookie', session.cookie).expect(200);
    expect(reports.body.byProcedure).toContainEqual({ name: `Procedimento Financeiro ${token}`, amountCents: 30000 });
    expect(reports.body.bySubscription).toContainEqual({ name: `Plano Financeiro ${token}`, amountCents: 15000 });
  });
  it('cancela sem excluir e impede cancelamento duplicado', async () => {
    await request(app.getHttpServer()).patch(`/api/financial/transactions/${manualId}/cancel`).set('Cookie', session.cookie).expect(200);
    await request(app.getHttpServer()).patch(`/api/financial/transactions/${manualId}/cancel`).set('Cookie', session.cookie).expect(409);
    expect(await prisma.financialTransaction.findUnique({ where: { id: manualId } })).toMatchObject({ status: 'CANCELADO', cancelledAt: expect.any(Date) });
  });
});

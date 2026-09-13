import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

describe('Módulo de agendamentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let session: TestSession;
  let clientId: string;
  let procedureId: string;
  let appointmentId: string;
  const token = Math.random().toString(36).slice(2, 8);

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    session = await createSession(app, 'appointments');
    const client = await prisma.client.create({ data: { fullName: `Cliente Agenda ${token}` } });
    clientId = client.id;
    const procedure = await prisma.procedure.create({ data: { name: `Procedimento Agenda ${token}`, unit: 'REGIAO' } });
    procedureId = procedure.id;
    await prisma.procedurePrice.create({ data: { procedureId, valueCents: 25000, validFrom: new Date('2026-01-01') } });
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { clientId } });
    await prisma.procedurePrice.deleteMany({ where: { procedureId } });
    await prisma.procedure.delete({ where: { id: procedureId } });
    await prisma.client.delete({ where: { id: clientId } });
    await destroySession(app, session);
    await app.close();
  });

  it('cria, consulta por dia e preserva snapshot comercial', async () => {
    const created = await request(app.getHttpServer()).post('/api/appointments').set('Cookie', session.cookie).send({
      clientId, procedureId, scheduledAt: '2026-09-20T14:00:00-03:00', quantity: 2, professional: 'Dra. Karine',
    }).expect(201);
    appointmentId = created.body.id;
    expect(created.body).toMatchObject({ procedureName: `Procedimento Agenda ${token}`, procedureUnit: 'REGIAO', unitValueCents: 25000, valueCents: 50000, status: 'AGENDADO' });

    const daily = await request(app.getHttpServer()).get('/api/appointments/agenda/diaria').query({ date: '2026-09-20' }).set('Cookie', session.cookie).expect(200);
    expect(daily.body.find((item: { id: string }) => item.id === appointmentId).clientName).toBe(`Cliente Agenda ${token}`);
  });

  it('confirma e realiza, recusando nova transição', async () => {
    await request(app.getHttpServer()).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', session.cookie).send({ status: 'CONFIRMADO' }).expect(200);
    await request(app.getHttpServer()).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', session.cookie).send({ status: 'REALIZADO' }).expect(200);
    await request(app.getHttpServer()).patch(`/api/appointments/${appointmentId}/status`).set('Cookie', session.cookie).send({ status: 'CANCELADO' }).expect(409);
  });

  it('filtra por período, cliente e status e valida payload', async () => {
    const list = await request(app.getHttpServer()).get('/api/appointments').query({ from: '2026-09-20T00:00:00-03:00', to: '2026-09-21T00:00:00-03:00', clientId, status: 'REALIZADO' }).set('Cookie', session.cookie).expect(200);
    expect(list.body).toHaveLength(1);
    await request(app.getHttpServer()).post('/api/appointments').set('Cookie', session.cookie).send({ clientId: 'invalido' }).expect(400);
  });
});

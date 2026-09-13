import { CashPolicyService } from '../src/modules/financial/services/cash-policy.service.js';
import { ConflictException } from '@nestjs/common';
import { AuditTrailService } from '../src/modules/audit/services/audit-trail.service.js';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/common/database/prisma.service.js';
import {
  createSession,
  destroySession,
  type TestSession,
} from './helpers/auth.js';
describe('Caixa mensal (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let session: TestSession;
  let accountId: string;
  let periodId: string;
  let transactionId: string;
  let nextPeriodId: string;
  const titleIds: string[] = [];
  let adjustmentId: string;
  const otherAccounts: string[] = [];
  let period3Id = '';
  const extraTransactions: string[] = [];
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    // O e2e roda no banco de desenvolvimento compartilhado, onde o caixa pode ter sido aberto
    // pela tela (ou por outra execução). O módulo abre um saldo por local cadastrado e exige
    // sequência de meses, então a suíte parte de um estado limpo — e só no banco `_dev`.
    const url = process.env.DATABASE_URL ?? '';
    if (!url.includes('_dev'))
      throw new Error('O e2e do caixa só roda no banco de desenvolvimento.');
    await prisma.financialReconciliation.deleteMany();
    await prisma.cashBalance.deleteMany();
    await prisma.cashPeriod.deleteMany();
    await prisma.resourceAccount.deleteMany();
    session = await createSession(app, 'cash');
  });
  afterAll(async () => {
    if (adjustmentId)
      await prisma.financialTransaction.delete({ where: { id: adjustmentId } });
    if (nextPeriodId)
      await prisma.financialReconciliation.deleteMany({
        where: { periodId: nextPeriodId },
      });
    if (titleIds.length) {
      const settlements = await prisma.financialSettlement.findMany({
        where: { titleId: { in: titleIds } },
      });
      await prisma.financialSettlement.deleteMany({
        where: { titleId: { in: titleIds } },
      });
      await prisma.financialTransaction.deleteMany({
        where: { id: { in: settlements.map((x) => x.transactionId) } },
      });
      await prisma.financialTitle.deleteMany({
        where: { id: { in: titleIds } },
      });
    }
    if (transactionId)
      await prisma.financialTransaction.delete({
        where: { id: transactionId },
      });
    if (nextPeriodId) {
      await prisma.cashBalance.deleteMany({
        where: { periodId: nextPeriodId },
      });
      await prisma.cashPeriod.delete({ where: { id: nextPeriodId } });
    }
    if (extraTransactions.length)
      await prisma.financialTransaction.deleteMany({
        where: { id: { in: extraTransactions } },
      });
    if (period3Id) {
      await prisma.cashBalance.deleteMany({ where: { periodId: period3Id } });
      await prisma.cashPeriod.delete({ where: { id: period3Id } });
    }
    if (periodId) {
      await prisma.cashBalance.deleteMany({ where: { periodId } });
      await prisma.cashPeriod.delete({ where: { id: periodId } });
    }
    if (otherAccounts.length)
      await prisma.resourceAccount.deleteMany({
        where: { id: { in: otherAccounts } },
      });
    if (accountId)
      await prisma.resourceAccount.delete({ where: { id: accountId } });
    await prisma.auditEvent.deleteMany({
      where: { actorUserId: session.userId },
    });
    await destroySession(app, session);
    await app.close();
  });
  it('cadastra local e abre mês uma única vez, inclusive em concorrência', async () => {
    const account = await request(app.getHttpServer())
      .post('/api/financial/accounts')
      .set('Cookie', session.cookie)
      .send({ name: `Espécie ${Date.now()}`, kind: 'CASH' })
      .expect(201);
    accountId = account.body.id;
    for (const kind of ['BANK', 'CARD']) {
      const a = await request(app.getHttpServer())
        .post('/api/financial/accounts')
        .set('Cookie', session.cookie)
        .send({ name: `${kind} ${crypto.randomUUID()}`, kind })
        .expect(201);
      otherAccounts.push(a.body.id);
    }
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/api/financial/cash-periods')
          .set('Cookie', session.cookie)
          .send({
            month: '2098-01',
            initialBalances: [
              { accountId, amountCents: 1000 },
              ...otherAccounts.map((id, i) => ({
                accountId: id,
                amountCents: (i + 2) * 1000,
              })),
            ],
          }),
      ),
    );
    expect(responses.map((x) => x.status).sort()).toEqual([201, 409]);
    periodId = responses.find((x) => x.status === 201)!.body.id;
    const detail = await request(app.getHttpServer())
      .get(`/api/financial/cash-periods/${periodId}`)
      .set('Cookie', session.cookie)
      .expect(200);
    expect(detail.body.balances).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          accountId,
          openingCents: 1000,
          expectedCents: 1000,
        }),
      ]),
    );
    // Consolidado do período aberto: soma dos três locais cadastrados na suíte.
    expect(detail.body.totals).toEqual({
      openingCents: 6000,
      incomingCents: 0,
      outgoingCents: 0,
      expectedCents: 6000,
      countedCents: null,
      differenceCents: null,
    });
  });
  it('movimenta, fecha, bloqueia cancelamento e transporta saldos por local', async () => {
    const movement = await request(app.getHttpServer())
      .post('/api/financial/transactions')
      .set('Cookie', session.cookie)
      .send({
        description: 'Entrada caixa e2e',
        type: 'RECEITA',
        status: 'PAGO',
        amountCents: 500,
        date: '2098-01-15T12:00:00-03:00',
        paymentMethod: 'DINHEIRO',
        resourceAccountId: accountId,
      })
      .expect(201);
    transactionId = movement.body.id;
    await request(app.getHttpServer())
      .post(`/api/financial/cash-periods/${periodId}/close`)
      .set('Cookie', session.cookie)
      .send({
        balances: [
          { accountId, amountCents: 1400 },
          ...otherAccounts.map((id, i) => ({
            accountId: id,
            amountCents: (i + 2) * 1000,
          })),
        ],
        reason: 'Contagem física',
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/financial/transactions/${transactionId}/cancel`)
      .set('Cookie', session.cookie)
      .expect(409);
    const closed = await request(app.getHttpServer())
      .get(`/api/financial/cash-periods/${periodId}`)
      .set('Cookie', session.cookie)
      .expect(200);
    expect(
      closed.body.balances.find(
        (b: { accountId: string }) => b.accountId === accountId,
      ),
    ).toMatchObject({
      openingCents: 1000,
      incomingCents: 500,
      outgoingCents: 0,
      expectedCents: 1500,
      countedCents: 1400,
      differenceCents: -100,
    });
    // Saldo total é um só: a composição é a soma dos locais (espécie + banco + maquineta).
    expect(closed.body.totals).toEqual({
      openingCents: 6000,
      incomingCents: 500,
      outgoingCents: 0,
      expectedCents: 6500,
      countedCents: 6400,
      differenceCents: -100,
    });
    const next = await request(app.getHttpServer())
      .post('/api/financial/cash-periods')
      .set('Cookie', session.cookie)
      .send({ month: '2098-02' })
      .expect(201);
    nextPeriodId = next.body.id;
    const detail = await request(app.getHttpServer())
      .get(`/api/financial/cash-periods/${nextPeriodId}`)
      .set('Cookie', session.cookie)
      .expect(200);
    expect(
      detail.body.balances.find(
        (b: { accountId: string }) => b.accountId === accountId,
      ).openingCents,
    ).toBe(1400);
    for (const [i, id] of otherAccounts.entries())
      expect(detail.body.balances).toContainEqual(
        expect.objectContaining({
          accountId: id,
          openingCents: (i + 2) * 1000,
        }),
      );
    expect(
      (
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: transactionId },
        })
      ).amountCents,
    ).toBe(500);
  });

  it.each(['RECEITA', 'DESPESA'])(
    'baixa parcial e total de %s, idempotência concorrente e saldo',
    async (type) => {
      const title = await request(app.getHttpServer())
        .post('/api/financial/titles')
        .set('Cookie', session.cookie)
        .send({
          type,
          description: 'Título e2e',
          amountCents: 1000,
          dueDate: '2098-02-20',
        })
        .expect(201);
      titleIds.push(title.body.id);
      const dto = {
        amountCents: 400,
        date: '2098-02-10',
        resourceAccountId: accountId,
        paymentMethod: 'DINHEIRO',
        idempotencyKey: crypto.randomUUID(),
      };
      const results = await Promise.all(
        [1, 2].map(() =>
          request(app.getHttpServer())
            .post(`/api/financial/titles/${title.body.id}/settlements`)
            .set('Cookie', session.cookie)
            .send(dto),
        ),
      );
      expect(results.map((x) => x.status)).toEqual([201, 201]);
      expect(results[0].body.id).toBe(results[1].body.id);
      let detail = await request(app.getHttpServer())
        .get(`/api/financial/titles/${title.body.id}`)
        .set('Cookie', session.cookie)
        .expect(200);
      expect(detail.body).toMatchObject({
        status: 'PARCIAL',
        paidCents: 400,
        remainingCents: 600,
      });
      await request(app.getHttpServer())
        .post(`/api/financial/titles/${title.body.id}/settlements`)
        .set('Cookie', session.cookie)
        .send({ ...dto, amountCents: 500 })
        .expect(409);
      await request(app.getHttpServer())
        .post(`/api/financial/titles/${title.body.id}/settlements`)
        .set('Cookie', session.cookie)
        .send({ ...dto, amountCents: 700, idempotencyKey: crypto.randomUUID() })
        .expect(409);
      await request(app.getHttpServer())
        .post(`/api/financial/titles/${title.body.id}/settlements`)
        .set('Cookie', session.cookie)
        .send({ ...dto, amountCents: 600, idempotencyKey: crypto.randomUUID() })
        .expect(201);
      detail = await request(app.getHttpServer())
        .get(`/api/financial/titles/${title.body.id}`)
        .set('Cookie', session.cookie)
        .expect(200);
      expect(detail.body).toMatchObject({
        status: 'PAGO',
        paidCents: 1000,
        remainingCents: 0,
      });
      expect(detail.body.settlements).toHaveLength(2);
      await request(app.getHttpServer())
        .patch(
          `/api/financial/transactions/${detail.body.settlements[0].transactionId}/cancel`,
        )
        .set('Cookie', session.cookie)
        .expect(409);
    },
  );
  it('falha na auditoria reverte baixa e movimento na mesma transação', async () => {
    const title = await request(app.getHttpServer())
      .post('/api/financial/titles')
      .set('Cookie', session.cookie)
      .send({
        type: 'DESPESA',
        description: 'Atomicidade',
        amountCents: 1000,
        dueDate: '2098-02-20',
      })
      .expect(201);
    titleIds.push(title.body.id);
    const before = await prisma.financialTransaction.count({
      where: { description: 'Atomicidade', resourceAccountId: accountId },
    });
    const spy = vi
      .spyOn(app.get(AuditTrailService), 'record')
      .mockRejectedValueOnce(new Error('Falha de auditoria simulada'));
    try {
      await request(app.getHttpServer())
        .post(`/api/financial/titles/${title.body.id}/settlements`)
        .set('Cookie', session.cookie)
        .send({
          amountCents: 500,
          date: '2098-02-10',
          resourceAccountId: accountId,
          paymentMethod: 'PIX',
          idempotencyKey: crypto.randomUUID(),
        })
        .expect(500);
    } finally {
      spy.mockRestore();
    }
    expect(
      await prisma.financialSettlement.count({
        where: { titleId: title.body.id },
      }),
    ).toBe(0);
    expect(
      await prisma.financialTransaction.count({
        where: { description: 'Atomicidade', resourceAccountId: accountId },
      }),
    ).toBe(before);
  });

  it('concilia com divergência sem mutação e audita ajuste em período aberto', async () => {
    const before = await prisma.financialTransaction.findMany({
      where: { resourceAccountId: accountId },
      orderBy: { id: 'asc' },
    });
    const reconciled = await request(app.getHttpServer())
      .post('/api/financial/reconciliations')
      .set('Cookie', session.cookie)
      .send({
        periodId: nextPeriodId,
        accountId,
        amountCents: 1300,
        reason: 'Extrato conferido',
      })
      .expect(201);
    expect(reconciled.body).toMatchObject({
      expectedCents: 1400,
      countedCents: 1300,
      differenceCents: -100,
    });
    expect(
      await prisma.financialTransaction.findMany({
        where: { resourceAccountId: accountId },
        orderBy: { id: 'asc' },
      }),
    ).toEqual(before);
    const dto = {
      description: 'Correção de entrada',
      type: 'DESPESA',
      amountCents: 100,
      date: '2098-02-11',
      resourceAccountId: accountId,
      paymentMethod: 'DINHEIRO',
      reason: 'Entrada original maior que o recebido',
      idempotencyKey: crypto.randomUUID(),
    };
    await request(app.getHttpServer())
      .post(`/api/financial/transactions/${transactionId}/adjustments`)
      .set('Cookie', session.cookie)
      .send({ ...dto, date: '2098-01-12' })
      .expect(409);
    const adjusted = await request(app.getHttpServer())
      .post(`/api/financial/transactions/${transactionId}/adjustments`)
      .set('Cookie', session.cookie)
      .send(dto)
      .expect(201);
    adjustmentId = adjusted.body.id;
    const repeated = await request(app.getHttpServer())
      .post(`/api/financial/transactions/${transactionId}/adjustments`)
      .set('Cookie', session.cookie)
      .send(dto)
      .expect(201);
    expect(repeated.body.id).toBe(adjustmentId);
    expect(
      await prisma.auditEvent.count({
        where: { entityId: adjustmentId, action: 'ADJUSTMENT_CREATED' },
      }),
    ).toBe(1);
    expect(
      (
        await prisma.financialTransaction.findUniqueOrThrow({
          where: { id: transactionId },
        })
      ).amountCents,
    ).toBe(500);
  });

  it('rejeição financeira não deixa pagamento de assinatura órfão', async () => {
    const client = await prisma.client.create({
      data: { fullName: 'Atomicidade financeira' },
    });
    const plan = await prisma.subscriptionPlan.create({
      data: { name: `Atomicidade ${crypto.randomUUID()}`, priceCents: 1000 },
    });
    const subscription = await prisma.clientSubscription.create({
      data: {
        clientId: client.id,
        planId: plan.id,
        startDate: new Date('2098-01-01'),
        contractedValueCents: 1000,
        planName: plan.name,
      },
    });
    const spy = vi
      .spyOn(app.get(CashPolicyService), 'assertWritable')
      .mockRejectedValueOnce(new ConflictException('Caixa fechado'));
    try {
      await request(app.getHttpServer())
        .post(`/api/subscriptions/${subscription.id}/payments`)
        .set('Cookie', session.cookie)
        .send({
          amountCents: 500,
          paidAt: '2098-01-15T12:00:00-03:00',
          paymentMethod: 'PIX',
        })
        .expect(409);
      expect(
        await prisma.subscriptionPayment.count({
          where: { subscriptionId: subscription.id },
        }),
      ).toBe(0);
    } finally {
      spy.mockRestore();
      await prisma.financialTransaction.deleteMany({
        where: { subscriptionId: subscription.id },
      });
      await prisma.subscriptionPayment.deleteMany({
        where: { subscriptionId: subscription.id },
      });
      await prisma.clientSubscription.delete({
        where: { id: subscription.id },
      });
      await prisma.subscriptionPlan.delete({ where: { id: plan.id } });
      await prisma.client.delete({ where: { id: client.id } });
    }
  });
  it('rejeição financeira não conclui atendimento sem gerar receita', async () => {
    const client = await prisma.client.create({
      data: { fullName: 'Atendimento atômico' },
    });
    const appointment = await prisma.appointment.create({
      data: {
        clientId: client.id,
        scheduledAt: new Date(),
        status: 'CONFIRMADO',
        valueCents: 1000,
      },
    });
    const spy = vi
      .spyOn(app.get(CashPolicyService), 'assertWritable')
      .mockRejectedValueOnce(new ConflictException('Caixa fechado'));
    try {
      await request(app.getHttpServer())
        .patch(`/api/appointments/${appointment.id}/status`)
        .set('Cookie', session.cookie)
        .send({ status: 'REALIZADO' })
        .expect(409);
      expect(
        (
          await prisma.appointment.findUniqueOrThrow({
            where: { id: appointment.id },
          })
        ).status,
      ).toBe('CONFIRMADO');
    } finally {
      spy.mockRestore();
      await prisma.financialTransaction.deleteMany({
        where: { appointmentId: appointment.id },
      });
      await prisma.appointment.delete({ where: { id: appointment.id } });
      await prisma.client.delete({ where: { id: client.id } });
    }
  });

  it('não permite mudar destino diretamente em baixa de conta', async () => {
    const settlement = await prisma.financialSettlement.findFirstOrThrow({
      where: { titleId: titleIds[0] },
    });
    await request(app.getHttpServer())
      .patch(`/api/financial/transactions/${settlement.transactionId}/resource`)
      .set('Cookie', session.cookie)
      .send({ resourceAccountId: otherAccounts[0], reason: 'Mudar destino' })
      .expect(409);
  });
  it('valida DTOs, paginação real e proíbe reabertura/alteração de caixa fechado', async () => {
    await request(app.getHttpServer())
      .get('/api/financial/titles')
      .query({ type: 'RECEITA', page: 1, pageSize: 20 })
      .set('Cookie', session.cookie)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/financial/cash-periods')
      .set('Cookie', session.cookie)
      .send({ month: '2098-13' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/financial/reconciliations')
      .set('Cookie', session.cookie)
      .send({
        periodId: nextPeriodId,
        accountId,
        amountCents: 1.5,
        reason: ' ',
      })
      .expect(400);
    await request(app.getHttpServer())
      .post(`/api/financial/titles/${titleIds[0]}/settlements`)
      .set('Cookie', session.cookie)
      .send({
        amountCents: 1,
        date: '2098-02-30',
        resourceAccountId: accountId,
        paymentMethod: 'PIX',
        idempotencyKey: crypto.randomUUID(),
      })
      .expect(400);
    await request(app.getHttpServer())
      .patch(`/api/financial/transactions/${transactionId}/resource`)
      .set('Cookie', session.cookie)
      .send({ resourceAccountId: otherAccounts[0], reason: 'Destino alterado' })
      .expect(409);
    await request(app.getHttpServer())
      .post(`/api/financial/cash-periods/${periodId}/close`)
      .set('Cookie', session.cookie)
      .send({ balances: [], reason: 'Repetir' })
      .expect(409);
    await request(app.getHttpServer())
      .get('/api/financial/cash-periods')
      .expect(401);
    await request(app.getHttpServer())
      .delete(`/api/financial/cash-periods/${periodId}`)
      .set('Cookie', session.cookie)
      .expect(404);
  });
  it('bloqueia correção de assinatura cujo lançamento pertence a caixa fechado e reverte o pagamento',async()=>{
    const client=await prisma.client.create({data:{fullName:'Correção em caixa fechado'}});
    const plan=await prisma.subscriptionPlan.create({data:{name:`Correção ${crypto.randomUUID()}`}});
    const sub=await prisma.clientSubscription.create({data:{clientId:client.id,planId:plan.id,startDate:new Date('2098-01-01'),contractedValueCents:1000}});
    const payment=await prisma.subscriptionPayment.create({data:{subscriptionId:sub.id,amountCents:1000,paidAt:new Date('2098-01-15T12:00:00-03:00'),paymentMethod:'PIX'}});
    const movement=await prisma.financialTransaction.create({data:{description:'Fixture de pagamento fechado',amountCents:1000,date:payment.paidAt,subscriptionPaymentId:payment.id,subscriptionId:sub.id,paymentMethod:'PIX',origin:'SUBSCRIPTION',resourceAccountId:accountId}});
    try{
      await request(app.getHttpServer()).patch(`/api/subscriptions/${sub.id}/payments/${payment.id}`).set('Cookie',session.cookie).send({amountCents:1200,paidAt:'2098-02-15T12:00:00-03:00',paymentMethod:'PIX',reason:'Corrigir valor e data'}).expect(409);
      expect((await prisma.subscriptionPayment.findUniqueOrThrow({where:{id:payment.id}})).amountCents).toBe(1000);
      expect((await prisma.financialTransaction.findUniqueOrThrow({where:{id:movement.id}})).date).toEqual(payment.paidAt);
      expect(await prisma.auditEvent.count({where:{entityId:payment.id}})).toBe(0);
    }finally{await prisma.financialTransaction.delete({where:{id:movement.id}});await prisma.subscriptionPayment.delete({where:{id:payment.id}});await prisma.clientSubscription.delete({where:{id:sub.id}});await prisma.subscriptionPlan.delete({where:{id:plan.id}});await prisma.client.delete({where:{id:client.id}});}
  });
  it('fechamento reverte snapshots se auditoria falhar; concorrência não perde movimento',async()=>{
    const balances=[{accountId,amountCents:1300},...otherAccounts.map((id,i)=>({accountId:id,amountCents:(i+2)*1000}))];
    const spy=vi.spyOn(app.get(AuditTrailService),'record').mockRejectedValueOnce(new Error('Falha simulada no fechamento'));
    try{await request(app.getHttpServer()).post(`/api/financial/cash-periods/${nextPeriodId}/close`).set('Cookie',session.cookie).send({balances,reason:'Fechamento atômico'}).expect(500);}finally{spy.mockRestore();}
    expect((await prisma.cashPeriod.findUniqueOrThrow({where:{id:nextPeriodId}})).closedAt).toBeNull();
    expect((await prisma.cashBalance.findMany({where:{periodId:nextPeriodId}})).every(b=>b.countedCents===null)).toBe(true);
    const [closing,moving]=await Promise.all([
      request(app.getHttpServer()).post(`/api/financial/cash-periods/${nextPeriodId}/close`).set('Cookie',session.cookie).send({balances,reason:'Fechamento concorrente'}),
      request(app.getHttpServer()).post('/api/financial/transactions').set('Cookie',session.cookie).send({description:'Movimento concorrente',type:'RECEITA',status:'PAGO',amountCents:300,date:'2098-02-20',resourceAccountId:accountId,paymentMethod:'DINHEIRO'})
    ]);
    expect(closing.status).toBe(201);expect([201,409]).toContain(moving.status);
    const snapshot=await prisma.cashBalance.findUniqueOrThrow({where:{periodId_accountId:{periodId:nextPeriodId,accountId}}});
    expect(snapshot.expectedCents).toBe(moving.status===201?1600:1300);
    if (moving.status===201)await prisma.financialTransaction.delete({where:{id:moving.body.id}});
  });
  it('edita a identificação, inativa preservando o histórico e reativa recriando o saldo', async () => {
    const alvo = otherAccounts[0];
    const novoNome = `Renomeado ${crypto.randomUUID().slice(0, 8)}`;
    const renomeado = await request(app.getHttpServer())
      .patch(`/api/financial/accounts/${alvo}`)
      .set('Cookie', session.cookie)
      .send({ name: novoNome })
      .expect(200);
    expect(renomeado.body.name).toBe(novoNome);
    // Nome já usado por outro local (sem diferenciar maiúsculas) e edição sem mudança são recusados.
    await request(app.getHttpServer())
      .patch(`/api/financial/accounts/${otherAccounts[1]}`)
      .set('Cookie', session.cookie)
      .send({ name: novoNome.toUpperCase() })
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/financial/accounts/${alvo}`)
      .set('Cookie', session.cookie)
      .send({ name: novoNome })
      .expect(400);
    // Abre o mês seguinte e coloca um lançamento em outro local (bloqueia inativar aquele local).
    const aberto = await request(app.getHttpServer())
      .post('/api/financial/cash-periods')
      .set('Cookie', session.cookie)
      .send({ month: '2098-03' })
      .expect(201);
    period3Id = aberto.body.id;
    const movimento = await request(app.getHttpServer())
      .post('/api/financial/transactions')
      .set('Cookie', session.cookie)
      .send({
        description: 'Movimento do mês aberto',
        type: 'RECEITA',
        status: 'PAGO',
        amountCents: 700,
        date: '2098-03-05',
        resourceAccountId: otherAccounts[1],
        paymentMethod: 'DINHEIRO',
      })
      .expect(201);
    extraTransactions.push(movimento.body.id);
    await request(app.getHttpServer())
      .patch(`/api/financial/accounts/${otherAccounts[1]}/inactivate`)
      .set('Cookie', session.cookie)
      .expect(409);
    // Sem lançamento no mês aberto, inativa: sai da lista nova, histórico dos meses fechados intacto.
    await request(app.getHttpServer())
      .patch(`/api/financial/accounts/${alvo}/inactivate`)
      .set('Cookie', session.cookie)
      .expect(200);
    const saldosHistoricos = await prisma.cashBalance.count({
      where: { accountId: alvo },
    });
    expect(saldosHistoricos).toBeGreaterThan(0);
    await request(app.getHttpServer())
      .patch(`/api/financial/accounts/${alvo}/inactivate`)
      .set('Cookie', session.cookie)
      .expect(409);
    const detalhe = await request(app.getHttpServer())
      .get(`/api/financial/cash-periods/${period3Id}`)
      .set('Cookie', session.cookie)
      .expect(200);
    expect(
      detalhe.body.balances.some(
        (b: { accountId: string }) => b.accountId === alvo,
      ),
    ).toBe(false);
    expect(detalhe.body.balances.length).toBe(2);
    // Reativar traz o local de volta ao mês aberto, começando do zero.
    await request(app.getHttpServer())
      .patch(`/api/financial/accounts/${alvo}/reactivate`)
      .set('Cookie', session.cookie)
      .expect(200);
    const depois = await request(app.getHttpServer())
      .get(`/api/financial/cash-periods/${period3Id}`)
      .set('Cookie', session.cookie)
      .expect(200);
    const reativado = depois.body.balances.find(
      (b: { accountId: string }) => b.accountId === alvo,
    );
    expect(reativado).toMatchObject({ openingCents: 0, expectedCents: 0 });
    expect(depois.body.balances.length).toBe(3);
    await request(app.getHttpServer())
      .patch(`/api/financial/accounts/${alvo}/reactivate`)
      .set('Cookie', session.cookie)
      .expect(409);
  });

});

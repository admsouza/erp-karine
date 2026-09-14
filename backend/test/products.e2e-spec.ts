import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/common/database/prisma.service.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

describe('Catálogo de produtos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let session: TestSession;
  const sufixo = Math.random().toString(36).slice(2, 8);
  let produtoId = '';

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    session = await createSession(app, 'produtos');
  });

  afterAll(async () => {
    await prisma.auditEvent.deleteMany({
      where: { entityType: 'Product', entityId: produtoId },
    });
    await prisma.financialTransaction.deleteMany({
      where: { productId: produtoId },
    });
    if (produtoId) await prisma.product.delete({ where: { id: produtoId } });
    await destroySession(app, session);
    await app.close();
  });

  it('exige sessão', async () => {
    await request(app.getHttpServer()).get('/api/products').expect(401);
  });

  it('cria, busca por nome, edita e recusa nome repetido', async () => {
    const criado = await request(app.getHttpServer())
      .post('/api/products')
      .set('Cookie', session.cookie)
            .send({
        name: `Produto E2E ${sufixo}`,
        priceCents: 4500,
        purchasePriceCents: 2800,
        commercialUse: 'AMBOS',
        unit: 'unidade',
      })
      .expect(201);
    produtoId = criado.body.id;
    expect(criado.body).toMatchObject({
      name: `Produto E2E ${sufixo}`,
      priceCents: 4500,
      purchasePriceCents: 2800,
      commercialUse: 'AMBOS',
      active: true,
    });
    // Nome repetido (sem diferenciar maiúsculas) e validação de entrada
    await request(app.getHttpServer())
      .post('/api/products')
      .set('Cookie', session.cookie)
      .send({ name: `produto e2e ${sufixo}` })
      .expect(409);
    await request(app.getHttpServer())
      .post('/api/products')
      .set('Cookie', session.cookie)
      .send({ name: '   ' })
      .expect(400);

    const pagina = await request(app.getHttpServer())
      .get('/api/products')
      .query({ search: `Produto E2E ${sufixo}`, active: 'true', page: 1, pageSize: 20 })
      .set('Cookie', session.cookie)
      .expect(200);
    expect(pagina.body.items).toEqual([
      expect.objectContaining({ id: produtoId, priceCents: 4500 }),
    ]);
    expect(pagina.body.total).toBe(1);

    const editado = await request(app.getHttpServer())
      .patch(`/api/products/${produtoId}`)
      .set('Cookie', session.cookie)
      .send({ priceCents: 4900 })
      .expect(200);
    expect(editado.body.priceCents).toBe(4900);
    // Edição sem mudança efetiva é recusada (a trilha não vira carimbo)
    await request(app.getHttpServer())
      .patch(`/api/products/${produtoId}`)
      .set('Cookie', session.cookie)
      .send({ priceCents: 4900 })
      .expect(400);
    const eventos = await prisma.auditEvent.findMany({
      where: { entityType: 'Product', entityId: produtoId },
      orderBy: { createdAt: 'asc' },
    });
    expect(eventos.map((x) => x.action)).toEqual(['CREATED', 'UPDATED']);
    expect(eventos[1].changes).toEqual([
      { field: 'priceCents', before: 4500, after: 4900 },
    ]);
  });

  it('inativa, some do seletor de venda e reativa', async () => {
    await request(app.getHttpServer())
      .patch(`/api/products/${produtoId}/inactivate`)
      .set('Cookie', session.cookie)
      .expect(200);
    const opcoes = await request(app.getHttpServer())
      .get('/api/products/options')
      .set('Cookie', session.cookie)
      .expect(200);
    expect(opcoes.body.some((x: { id: string }) => x.id === produtoId)).toBe(false);
    await request(app.getHttpServer())
      .patch(`/api/products/${produtoId}/inactivate`)
      .set('Cookie', session.cookie)
      .expect(409);
    await request(app.getHttpServer())
      .patch(`/api/products/${produtoId}/reactivate`)
      .set('Cookie', session.cookie)
      .expect(200);
    expect(
      (await prisma.product.findUniqueOrThrow({ where: { id: produtoId } })).active,
    ).toBe(true);
    // Sem exclusão física
    await request(app.getHttpServer())
      .delete(`/api/products/${produtoId}`)
      .set('Cookie', session.cookie)
      .expect(404);
  });

  it('lança uma venda de produto com snapshot do nome e recusa item duplicado', async () => {
    const venda = await request(app.getHttpServer())
      .post('/api/financial/transactions')
      .set('Cookie', session.cookie)
      .send({
        description: `Venda de produto ${sufixo}`,
        productId: produtoId,
        amountCents: 4900,
        date: new Date().toISOString(),
        paymentMethod: 'PIX',
        type: 'RECEITA',
        status: 'PAGO',
      })
      .expect(201);
    expect(venda.body).toMatchObject({
      productId: produtoId,
      productName: `Produto E2E ${sufixo}`,
      amountCents: 4900,
    });
    const compra = await request(app.getHttpServer())
      .post('/api/financial/transactions')
      .set('Cookie', session.cookie)
      .send({ description: `Compra de produto ${sufixo}`, productId: produtoId, counterparty: `Credor ${sufixo}`, amountCents: 2800, date: new Date().toISOString(), paymentMethod: 'PIX', type: 'DESPESA', status: 'PAGO' })
      .expect(201);
    expect(compra.body).toMatchObject({ productId: produtoId, productName: `Produto E2E ${sufixo}`, amountCents: 2800, type: 'DESPESA' });
    await request(app.getHttpServer())
      .patch(`/api/products/${produtoId}`)
      .set('Cookie', session.cookie)
      .send({ commercialUse: 'VENDA' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/financial/transactions')
      .set('Cookie', session.cookie)
      .send({ description: 'Compra incompatível', productId: produtoId, counterparty: 'Credor', amountCents: 100, date: new Date().toISOString(), paymentMethod: 'PIX', type: 'DESPESA', status: 'PAGO' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/financial/transactions')
      .set('Cookie', session.cookie)
      .send({
        description: 'Combo',
        productId: produtoId,
        procedureId: '00000000-0000-4000-8000-000000000000',
        amountCents: 1000,
        date: new Date().toISOString(),
        paymentMethod: 'PIX',
        type: 'RECEITA',
        status: 'PAGO',
      })
      .expect(400);
  });
});

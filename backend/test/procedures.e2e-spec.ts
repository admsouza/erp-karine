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

  it('cadastra com valor inicial e devolve o valor vigente', async () => {
    const criado = await request(app.getHttpServer())
      .post('/api/procedures')
      .set('Cookie', sessao.cookie)
      .send({ name: nome('Limpeza'), description: 'Higienização profunda', durationMinutes: 60, initialValueCents: 18000 })
      .expect(201);

    criados.push(criado.body.id);
    expect(criado.body).toMatchObject({
      name: nome('Limpeza'),
      durationMinutes: 60,
      currentValueCents: 18000,
      active: true,
    });
    expect(criado.body).not.toHaveProperty('defaultValueCents');

    const vigencias = await request(app.getHttpServer())
      .get(`/api/procedures/${criado.body.id}/prices`)
      .set('Cookie', sessao.cookie)
      .expect(200);

    expect(vigencias.body).toHaveLength(1);
    expect(vigencias.body[0]).toMatchObject({ valueCents: 18000, validTo: null });
  });

  it('cadastro sem valor fica sem valor vigente', async () => {
    const criado = await request(app.getHttpServer())
      .post('/api/procedures')
      .set('Cookie', sessao.cookie)
      .send({ name: nome('SemValor') })
      .expect(201);

    criados.push(criado.body.id);
    expect(criado.body.currentValueCents).toBeNull();
  });

  it('pesquisa, edita, inativa e reativa', async () => {
    const busca = await request(app.getHttpServer())
      .get('/api/procedures')
      .query({ search: `Procedimento E2E ${runToken}` })
      .set('Cookie', sessao.cookie)
      .expect(200);
    expect(busca.body.total).toBeGreaterThanOrEqual(1);

    const alvo = criados[0];
    const editado = await request(app.getHttpServer())
      .patch(`/api/procedures/${alvo}`)
      .set('Cookie', sessao.cookie)
      .send({ durationMinutes: 90 })
      .expect(200);
    expect(editado.body.durationMinutes).toBe(90);
    expect(editado.body.name).toBe(nome('Limpeza'));

    const inativado = await request(app.getHttpServer())
      .patch(`/api/procedures/${alvo}/inactivate`)
      .set('Cookie', sessao.cookie)
      .expect(200);
    expect(inativado.body.active).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/procedures/${alvo}/inactivate`)
      .set('Cookie', sessao.cookie)
      .expect(409);

    const reativado = await request(app.getHttpServer())
      .patch(`/api/procedures/${alvo}/reactivate`)
      .set('Cookie', sessao.cookie)
      .expect(200);
    expect(reativado.body.active).toBe(true);
  });

  it('não aceita valor pela edição do cadastro (400)', async () => {
    await request(app.getHttpServer())
      .patch(`/api/procedures/${criados[0]}`)
      .set('Cookie', sessao.cookie)
      .send({ defaultValueCents: 99999 })
      .expect(400);

    await request(app.getHttpServer())
      .patch(`/api/procedures/${criados[0]}`)
      .set('Cookie', sessao.cookie)
      .send({ initialValueCents: 99999 })
      .expect(400);
  });

  describe('unidade de medida', () => {
    it('cadastra com unidade e devolve no payload', async () => {
      const criado = await request(app.getHttpServer())
        .post('/api/procedures')
        .set('Cookie', sessao.cookie)
        .send({ name: nome('Unidade'), unit: 'REGIAO', initialValueCents: 90000 })
        .expect(201);

      criados.push(criado.body.id);
      expect(criado.body.unit).toBe('REGIAO');

      const detalhe = await request(app.getHttpServer())
        .get(`/api/procedures/${criado.body.id}`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(detalhe.body.unit).toBe('REGIAO');
    });

    it('sem unidade informada, assume SESSAO', async () => {
      const criado = await request(app.getHttpServer())
        .post('/api/procedures')
        .set('Cookie', sessao.cookie)
        .send({ name: nome('UnidadePadrao') })
        .expect(201);

      criados.push(criado.body.id);
      expect(criado.body.unit).toBe('SESSAO');
    });

    it('permite trocar a unidade pela edição do cadastro', async () => {
      const criado = await request(app.getHttpServer())
        .post('/api/procedures')
        .set('Cookie', sessao.cookie)
        .send({ name: nome('UnidadeTroca'), unit: 'ML', initialValueCents: 75000 })
        .expect(201);
      criados.push(criado.body.id);

      const editado = await request(app.getHttpServer())
        .patch(`/api/procedures/${criado.body.id}`)
        .set('Cookie', sessao.cookie)
        .send({ unit: 'APLICACAO' })
        .expect(200);
      expect(editado.body.unit).toBe('APLICACAO');
    });

    it('recusa unidade inválida (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/procedures')
        .set('Cookie', sessao.cookie)
        .send({ name: nome('UnidadeInvalida'), unit: 'PARALELOGRAMO' })
        .expect(400);
    });
  });

  describe('vigências de valor (série histórica)', () => {
    let procedimentoId: string;

    beforeAll(async () => {
      const criado = await request(app.getHttpServer())
        .post('/api/procedures')
        .set('Cookie', sessao.cookie)
        .send({ name: nome('Vigencia'), initialValueCents: 10000 })
        .expect(201);
      procedimentoId = criado.body.id;
      criados.push(procedimentoId);
    });

    it('novo valor fecha a vigência anterior e mantém o histórico', async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

      const antiga = await request(app.getHttpServer())
        .get(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .expect(200);

      const nova = await request(app.getHttpServer())
        .post(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .send({ valueCents: 15000, validFrom: amanha, note: 'Reajuste' })
        .expect(201);
      expect(nova.body).toMatchObject({ valueCents: 15000, validTo: null, note: 'Reajuste' });

      const atualizadas = await request(app.getHttpServer())
        .get(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(atualizadas.body).toHaveLength(2);
      expect(atualizadas.body[0].valueCents).toBe(15000);
      // a antiga foi fechada no dia em que a nova começa
      expect(atualizadas.body[1].validTo.slice(0, 10)).toBe(amanha);
      expect(atualizadas.body[1].id).toBe(antiga.body[0].id);

      // histórico por data: hoje ainda vale o valor antigo, amanhã o novo
      const hojeValor = await request(app.getHttpServer())
        .get(`/api/procedures/${procedimentoId}/price-on`)
        .query({ date: hoje })
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(hojeValor.body.valueCents).toBe(10000);

      const amanhaValor = await request(app.getHttpServer())
        .get(`/api/procedures/${procedimentoId}/price-on`)
        .query({ date: amanha })
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(amanhaValor.body.valueCents).toBe(15000);
    });

    it('corrige o valor da vigência atual de um procedimento já gravado', async () => {
      // caso real: valor já cadastrado (vigência começando hoje) precisa ser corrigido
      const criado = await request(app.getHttpServer())
        .post('/api/procedures')
        .set('Cookie', sessao.cookie)
        .send({ name: nome('CorrecaoValor'), unit: 'REGIAO', initialValueCents: 20000 })
        .expect(201);
      criados.push(criado.body.id);
      expect(criado.body.currentValueCents).toBe(20000);

      const vigencias = await request(app.getHttpServer())
        .get(`/api/procedures/${criado.body.id}/prices`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(vigencias.body).toHaveLength(1);

      const corrigida = await request(app.getHttpServer())
        .patch(`/api/procedures/${criado.body.id}/prices/${vigencias.body[0].id}`)
        .set('Cookie', sessao.cookie)
        .send({ valueCents: 22000, note: 'Valor corrigido' })
        .expect(200);
      expect(corrigida.body.valueCents).toBe(22000);
      expect(corrigida.body.note).toBe('Valor corrigido');
      expect(corrigida.body.validTo).toBeNull();

      // o valor vigente do procedimento acompanha a correção
      const procedimento = await request(app.getHttpServer())
        .get(`/api/procedures/${criado.body.id}`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(procedimento.body.currentValueCents).toBe(22000);

      // e a consulta por data também
      const valor = await request(app.getHttpServer())
        .get(`/api/procedures/${criado.body.id}/price-on`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(valor.body.valueCents).toBe(22000);
    });

    it('correção não altera o valor de datas anteriores à vigência', async () => {
      const criado = await request(app.getHttpServer())
        .post('/api/procedures')
        .set('Cookie', sessao.cookie)
        .send({ name: nome('CorrecaoFutura'), initialValueCents: 30000 })
        .expect(201);
      criados.push(criado.body.id);

      const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
      await request(app.getHttpServer())
        .post(`/api/procedures/${criado.body.id}/prices`)
        .set('Cookie', sessao.cookie)
        .send({ valueCents: 35000, validFrom: amanha })
        .expect(201);

      const abertas = await request(app.getHttpServer())
        .get(`/api/procedures/${criado.body.id}/prices`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      const vigente = abertas.body.find((v: { validTo: null | string }) => v.validTo === null);

      // corrige a vigência que começa amanhã: hoje continua valendo o valor antigo
      await request(app.getHttpServer())
        .patch(`/api/procedures/${criado.body.id}/prices/${vigente.id}`)
        .set('Cookie', sessao.cookie)
        .send({ valueCents: 40000 })
        .expect(200);

      const hoje = await request(app.getHttpServer())
        .get(`/api/procedures/${criado.body.id}/price-on`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(hoje.body.valueCents).toBe(30000);

      const amanhaValor = await request(app.getHttpServer())
        .get(`/api/procedures/${criado.body.id}/price-on`)
        .query({ date: amanha })
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(amanhaValor.body.valueCents).toBe(40000);
    });

    it('recusa corrigir vigência já encerrada (409) e payload vazio (400)', async () => {
      const vigencias = await request(app.getHttpServer())
        .get(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      const encerrada = vigencias.body.find((v: { validTo: null | string }) => v.validTo !== null);

      await request(app.getHttpServer())
        .patch(`/api/procedures/${procedimentoId}/prices/${encerrada.id}`)
        .set('Cookie', sessao.cookie)
        .send({ valueCents: 9999 })
        .expect(409);

      const atual = vigencias.body.find((v: { validTo: null | string }) => v.validTo === null);
      await request(app.getHttpServer())
        .patch(`/api/procedures/${procedimentoId}/prices/${atual.id}`)
        .set('Cookie', sessao.cookie)
        .send({})
        .expect(400);
    });

    it('recusa vigência que começa antes da mais recente (409)', async () => {
      await request(app.getHttpServer())
        .post(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .send({ valueCents: 12000, validFrom: '2020-01-01' })
        .expect(409);
    });

    it('recusa valor inválido (400)', async () => {
      await request(app.getHttpServer())
        .post(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .send({ valueCents: 10.5 })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .send({ valueCents: -1 })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .send({ valueCents: 1000, validFrom: '13/09/2026' })
        .expect(400);
    });

    it('remover a vigência atual faz a anterior voltar a valer', async () => {
      const vigencias = await request(app.getHttpServer())
        .get(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      const atual = vigencias.body.find((v: { validTo: null | string }) => v.validTo === null);

      await request(app.getHttpServer())
        .delete(`/api/procedures/${procedimentoId}/prices/${atual.id}`)
        .set('Cookie', sessao.cookie)
        .expect(204);

      const restantes = await request(app.getHttpServer())
        .get(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(restantes.body).toHaveLength(1);
      expect(restantes.body[0].validTo).toBeNull();

      // voltou a valer o valor original em qualquer data futura
      const valor = await request(app.getHttpServer())
        .get(`/api/procedures/${procedimentoId}/price-on`)
        .set('Cookie', sessao.cookie)
        .expect(200);
      expect(valor.body.valueCents).toBe(10000);
    });

    it('não remove o único valor do procedimento (409)', async () => {
      const vigencias = await request(app.getHttpServer())
        .get(`/api/procedures/${procedimentoId}/prices`)
        .set('Cookie', sessao.cookie)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/api/procedures/${procedimentoId}/prices/${vigencias.body[0].id}`)
        .set('Cookie', sessao.cookie)
        .expect(409);
    });

    it('responde 404 para procedimento inexistente', async () => {
      await request(app.getHttpServer())
        .get('/api/procedures/00000000-0000-4000-8000-000000000000/prices')
        .set('Cookie', sessao.cookie)
        .expect(404);
    });
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

  it('valida payload de cadastro com 400', async () => {
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
      .get('/api/procedures/nao-e-uuid')
      .set('Cookie', sessao.cookie)
      .expect(400);
  });
});

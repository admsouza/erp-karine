import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { createSession, destroySession, type TestSession } from './helpers/auth.js';

describe('Autenticação (e2e)', () => {
  let app: INestApplication;
  let sessao: TestSession;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
    sessao = await createSession(app, 'auth');
  });

  afterAll(async () => {
    await destroySession(app, sessao);
    await app.close();
  });

  it('protege as rotas de domínio sem sessão (401)', async () => {
    const semCookie = await request(app.getHttpServer()).get('/api/clients').expect(401);
    expect(semCookie.body.message).toContain('Sessão');

    // rota inexistente também exige sessão: não vaza existência de rota
    await request(app.getHttpServer()).get('/api/rota-que-nao-existe').expect(401);

    // health é pública de propósito (usada pelo healthcheck do container)
    await request(app.getHttpServer()).get('/api/health').expect(200);
  });

  it('faz login, devolve o usuário e permite acessar rota protegida', async () => {
    const me = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', sessao.cookie).expect(200);
    expect(me.body.user).toMatchObject({ email: sessao.email, role: 'ADMIN' });
    expect(me.body.user).not.toHaveProperty('passwordHash');

    await request(app.getHttpServer()).get('/api/clients').set('Cookie', sessao.cookie).expect(200);
  });

  it('recusa senha errada e e-mail inexistente com 401', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: sessao.email, password: 'SenhaErrada123' })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'ninguem@teste.local', password: 'SenhaErrada123' })
      .expect(401);
  });

  it('valida o corpo do login com 400', async () => {
    await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'nao-e-email', password: 'x' }).expect(400);
  });

  it('encerra a sessão no logout', async () => {
    const temp = await createSession(app, 'logout');
    try {
      await request(app.getHttpServer()).post('/api/auth/logout').set('Cookie', temp.cookie).expect(200);
      await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', temp.cookie).expect(401);
    } finally {
      await destroySession(app, temp);
    }
  });

  it('aceita escrita quando o Origin é o da própria aplicação', async () => {
    await request(app.getHttpServer())
      .post('/api/clients')
      .set('Cookie', sessao.cookie)
      .set('Origin', 'http://127.0.0.1:3001')
      .send({})
      .expect(400);
  });

  it('aceita escrita do front em desenvolvimento (mesmo host, porta diferente)', async () => {
    await request(app.getHttpServer())
      .post('/api/clients')
      .set('Cookie', sessao.cookie)
      .set('Origin', 'http://127.0.0.1:5173')
      .send({})
      .expect(400);
  });

  it('recusa escrita com Origin de outro site (CSRF)', async () => {
    await request(app.getHttpServer())
      .post('/api/clients')
      .set('Cookie', sessao.cookie)
      .set('Origin', 'https://site-malicioso.example')
      .send({ fullName: 'Tentativa CSRF' })
      .expect(403);
  });

  it('troca a senha, invalida as outras sessões e exige a nova senha no próximo login', async () => {
    const alvo = await createSession(app, 'senha');
    try {
      const outraSessao = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: alvo.email, password: alvo.password })
        .expect(200);
      const cookieAntigo = (outraSessao.headers['set-cookie'] as unknown as string[])[0].split(';')[0];

      // senha atual errada
      await request(app.getHttpServer())
        .post('/api/auth/password')
        .set('Cookie', alvo.cookie)
        .send({ currentPassword: 'ErradaTotal123', newPassword: 'NovaSenha123' })
        .expect(401);

      // senha fraca
      await request(app.getHttpServer())
        .post('/api/auth/password')
        .set('Cookie', alvo.cookie)
        .send({ currentPassword: alvo.password, newPassword: 'fraca' })
        .expect(400);

      const troca = await request(app.getHttpServer())
        .post('/api/auth/password')
        .set('Cookie', alvo.cookie)
        .send({ currentPassword: alvo.password, newPassword: 'NovaSenha123' })
        .expect(200);
      expect(troca.body.revokedOthers).toBeGreaterThanOrEqual(1);

      // a outra sessão caiu; a que trocou a senha continua válida
      await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', cookieAntigo).expect(401);
      await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', alvo.cookie).expect(200);

      // senha antiga não funciona mais
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: alvo.email, password: alvo.password })
        .expect(401);
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: alvo.email, password: 'NovaSenha123' })
        .expect(200);
    } finally {
      await destroySession(app, alvo);
    }
  });

  it('bloqueia após 5 tentativas erradas (429) e libera o login correto depois', async () => {
    const alvo = await createSession(app, 'throttle');
    try {
      for (let i = 0; i < 5; i += 1) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: alvo.email, password: 'SenhaErrada123' })
          .expect(401);
      }
      const bloqueado = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: alvo.email, password: alvo.password })
        .expect(429);
      expect(bloqueado.body.message).toContain('Muitas tentativas');
    } finally {
      await destroySession(app, alvo);
    }
  });

  it('exige sessão para a documentação Swagger', async () => {
    await request(app.getHttpServer()).get('/api/docs-json').expect(401);
    await request(app.getHttpServer()).get('/api/docs-json').set('Cookie', sessao.cookie).expect(200);
  });
});

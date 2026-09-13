import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('GET /api/health informa que a API e o banco estão operacionais', async () => {
    const response = await request(app.getHttpServer()).get('/api/health').expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      database: 'up',
    });
  });

  it('GET /api/docs-json publica o contrato OpenAPI', async () => {
    const response = await request(app.getHttpServer()).get('/api/docs-json').expect(200);

    expect(response.body.info.title).toBe('ERP Clínica — API');
    expect(response.body.paths).toHaveProperty('/api/health');
  });

  it('rota inexistente responde no formato de erro padronizado', async () => {
    const response = await request(app.getHttpServer()).get('/api/rota-inexistente').expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      path: '/api/rota-inexistente',
    });
    expect(response.body.timestamp).toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});

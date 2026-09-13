import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import type { Request, Response } from 'express';
import { ApiExceptionFilter } from './common/exceptions/api-exception.filter.js';
import { SessionService } from './modules/auth/services/session.service.js';

/**
 * Configuração compartilhada entre o bootstrap da aplicação (main.ts)
 * e os testes de integração, garantindo que ambos exercitem a mesma stack
 * de prefixo global, validação, tratamento de erro, CORS e documentação.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');

  // Necessário para ler o cookie de sessão (httpOnly) e para o rate limit de
  // login enxergar o IP real do cliente atrás do proxy do CapRover.
  app.use(cookieParser());
  const express = app.getHttpAdapter().getInstance() as { set?: (key: string, value: unknown) => void };
  express.set?.('trust proxy', 1);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new ApiExceptionFilter());

  app.enableCors({
    origin: corsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // A documentação é registrada depois deste middleware de propósito: no Express
  // quem casa primeiro é quem foi registrado primeiro.
  protectSwagger(app);
  registerSwagger(app);
}

/**
 * A documentação Swagger fica fora do pipeline de guards do Nest (o
 * SwaggerModule registra handlers direto no Express), então a sessão é
 * validada aqui na mão — a API é de uso interno.
 */
function protectSwagger(app: INestApplication): void {
  const express = app.getHttpAdapter().getInstance() as {
    use: (path: string[], handler: (req: Request, res: Response, next: () => void) => void) => void;
  };
  const sessions = app.get(SessionService);

  express.use(['/api/docs', '/api/docs-json'], (req, res, next) => {
    void sessions
      .resolve(req.cookies?.erp_session)
      .then((user) => {
        if (user) return next();
        res.status(401).json({
          statusCode: 401,
          error: 'Unauthorized',
          message: 'Faça login para acessar a documentação da API.',
          path: req.originalUrl,
          timestamp: new Date().toISOString(),
        });
      })
      .catch(() => next());
  });
}

function registerSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('ERP Clínica — API')
    .setDescription(
      'API REST do sistema de gestão da clínica (clientes, agenda, assinaturas, financeiro, protocolos e exames).',
    )
    .setVersion('0.1.0')
    .addTag('health', 'Status do serviço')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}

function corsOrigins(): string[] | boolean {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) {
    return true;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

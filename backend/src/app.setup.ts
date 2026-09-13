import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ApiExceptionFilter } from './common/exceptions/api-exception.filter.js';

/**
 * Configuração compartilhada entre o bootstrap da aplicação (main.ts)
 * e os testes de integração, garantindo que ambos exercitem a mesma stack
 * de prefixo global, validação, tratamento de erro, CORS e documentação.
 */
export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');

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
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  registerSwagger(app);
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

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { NotFoundModule } from './common/not-found.module.js';
import { PrismaModule } from './common/prisma/prisma.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { ExamsModule } from './exams/exams.module.js';
import { FinancialModule } from './financial/financial.module.js';
import { HealthModule } from './health/health.module.js';
import { ProceduresModule } from './procedures/procedures.module.js';
import { ProtocolsModule } from './protocols/protocols.module.js';
import { SubscriptionsModule } from './subscriptions/subscriptions.module.js';

const FRONTEND_DIST = process.env.FRONTEND_DIST ?? resolve(process.cwd(), '..', 'frontend', 'dist');

/**
 * Em produção o backend também serve o build do frontend (um único app CapRover).
 * Em desenvolvimento o frontend roda no Vite (porta 5173) e o build pode não existir,
 * por isso o módulo de arquivos estáticos só é registrado quando há build disponível.
 */
function staticFilesImports(): DynamicModule[] {
  if (!existsSync(FRONTEND_DIST)) {
    return [];
  }
  return [
    ServeStaticModule.forRoot({
      rootPath: FRONTEND_DIST,
      exclude: ['/api/{*path}'],
    }),
  ];
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ...staticFilesImports(),
    HealthModule,
    ClientsModule,
    ProceduresModule,
    AppointmentsModule,
    SubscriptionsModule,
    FinancialModule,
    ProtocolsModule,
    ExamsModule,
    DashboardModule,
    // Deve ser o último import: o curinga de 404 só pode ser avaliado
    // depois de todas as rotas reais estarem registradas.
    NotFoundModule,
  ],
})
export class AppModule {}

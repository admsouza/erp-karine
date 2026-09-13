import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Module, type DynamicModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { DatabaseModule } from './common/database/database.module.js';
import { DomainEventsModule } from './common/events/domain-events.module.js';
import { NotFoundModule } from './common/exceptions/not-found.module.js';
import { HealthModule } from './common/health/health.module.js';
import { OriginGuard } from './common/guards/origin.guard.js';
import { RolesGuard } from './common/guards/roles.guard.js';
import { AppointmentsModule } from './modules/appointments/appointments.module.js';
import { AuditModule } from './modules/audit/audit.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { SessionAuthGuard } from './modules/auth/guards/session-auth.guard.js';
import { ClientsModule } from './modules/clients/clients.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { ExamsModule } from './modules/exams/exams.module.js';
import { FinancialModule } from './modules/financial/financial.module.js';
import { MaintenanceModule } from './modules/maintenance/maintenance.module.js';
import { ProceduresModule } from './modules/procedures/procedures.module.js';
import { ProtocolsModule } from './modules/protocols/protocols.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';

const FRONTEND_DIST = process.env.FRONTEND_DIST ?? resolve(process.cwd(), '..', 'frontend', 'dist');

/**
 * Em produção o backend também serve o build do frontend (um único app no CapRover).
 * Em desenvolvimento o frontend roda no Vite (5173) e o build pode nem existir,
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
    DatabaseModule,
    DomainEventsModule,
    ...staticFilesImports(),
    HealthModule,
    // Sessão: o guard global abaixo protege todas as rotas de /api.
    AuthModule,
    AuditModule,
    ClientsModule,
    ProceduresModule,
    AppointmentsModule,
    SubscriptionsModule,
    FinancialModule,
    ProtocolsModule,
    ExamsModule,
    DashboardModule,
    MaintenanceModule,
    // Deve permanecer como ÚLTIMO import: o curinga de 404 da API só pode ser
    // avaliado depois de todas as rotas reais estarem registradas.
    NotFoundModule,
  ],
  providers: [
    // Ordem importa: primeiro valida a sessão (a menos que @Public), depois a
    // origem das requisições de escrita (defesa de CSRF).
    { provide: APP_GUARD, useClass: SessionAuthGuard },
    { provide: APP_GUARD, useClass: OriginGuard },
    // Autorização por perfil roda depois da sessão: o perfil vem do usuário autenticado.
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { UsersController } from './controllers/users.controller.js';
import { AuthService } from './services/auth.service.js';
import { SessionService } from './services/session.service.js';
import { LoginThrottleService } from './services/login-throttle.service.js';
import { UserAdminService } from './services/user-admin.service.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';
import { UserRepository } from './repositories/user.repository.js';
import { SessionRepository } from './repositories/session.repository.js';

/**
 * Autenticação, sessão e **administração de usuários**.
 *
 * Depende de: `audit` (trilha das alterações de usuário) e `common/database`.
 * Expõe: `AuthService` e `SessionService` (para outros módulos precisarem do
 * usuário logado) e `SessionAuthGuard` (registrado globalmente no AppModule).
 */
@Module({
  imports: [AuditModule],
  controllers: [AuthController, UsersController],
  providers: [
    UserRepository,
    SessionRepository,
    SessionService,
    AuthService,
    LoginThrottleService,
    UserAdminService,
    SessionAuthGuard,
  ],
  exports: [AuthService, SessionService, SessionAuthGuard],
})
export class AuthModule {}

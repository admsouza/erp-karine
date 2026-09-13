import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './services/auth.service.js';
import { SessionService } from './services/session.service.js';
import { LoginThrottleService } from './services/login-throttle.service.js';
import { SessionAuthGuard } from './guards/session-auth.guard.js';
import { UserRepository } from './repositories/user.repository.js';
import { SessionRepository } from './repositories/session.repository.js';

/**
 * Autenticação e sessão.
 *
 * Depende de: nada (usa `common/database`).
 * Expõe: `AuthService` e `SessionService` (para outros módulos precisarem do
 * usuário logado) e `SessionAuthGuard` (registrado globalmente no AppModule).
 */
@Module({
  controllers: [AuthController],
  providers: [
    UserRepository,
    SessionRepository,
    SessionService,
    AuthService,
    LoginThrottleService,
    SessionAuthGuard,
  ],
  exports: [AuthService, SessionService, SessionAuthGuard],
})
export class AuthModule {}

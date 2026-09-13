import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { User } from '../../../generated/prisma/client.js';
import { UserRepository } from '../repositories/user.repository.js';
import {
  SessionService,
  type SessionContext,
} from './session.service.js';
import { LoginThrottleService } from './login-throttle.service.js';
import { toAuthenticatedUser, type AuthenticatedUser } from '../entities/authenticated-user.entity.js';
import { SENHA_REGEX } from '../dto/change-password.dto.js';
import type { LoginDto } from '../dto/login.dto.js';

const BCRYPT_COST = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionService,
    private readonly throttle: LoginThrottleService,
  ) {}

  async login(
    dto: LoginDto,
    context: SessionContext,
  ): Promise<{ user: AuthenticatedUser; token: string; expiresAt: Date }> {
    const ip = context.ip ?? 'desconhecido';

    const bloqueioSegundos = this.throttle.blockedFor(ip, dto.email);
    if (bloqueioSegundos > 0) {
      const minutos = Math.ceil(bloqueioSegundos / 60);
      throw new HttpException(
        `Muitas tentativas de login. Tente novamente em ${minutos} minuto(s).`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const user = await this.users.findByEmail(dto.email);
    const senhaConfere = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    if (!user || !senhaConfere) {
      this.throttle.registerFailure(ip, dto.email);
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo. Procure o administrador do sistema.');
    }

    this.throttle.reset(ip, dto.email);
    const { token, expiresAt, sessionId } = await this.sessions.issue(user, context);
    await this.users.update(user.id, { lastLoginAt: new Date() });
    this.logger.log(`Login de ${user.email} (sessão ${sessionId}).`);

    return { user: toAuthenticatedUser(user, sessionId), token, expiresAt };
  }

  async logout(token: string | undefined): Promise<void> {
    await this.sessions.revokeByToken(token);
  }

  /** Troca a própria senha e derruba as outras sessões do usuário. */
  async changePassword(
    authenticated: AuthenticatedUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ revokedOthers: number }> {
    const user = await this.requireUser(authenticated.id);

    const confere = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!confere) throw new UnauthorizedException('Senha atual incorreta.');
    if (currentPassword === newPassword) {
      throw new BadRequestException('A nova senha deve ser diferente da atual.');
    }
    if (newPassword.toLowerCase() === user.email.toLowerCase()) {
      throw new BadRequestException('A senha não pode ser igual ao e-mail.');
    }
    if (!SENHA_REGEX.test(newPassword)) {
      throw new BadRequestException('A nova senha deve ter ao menos 8 caracteres, com letras e números.');
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
    await this.users.update(user.id, { passwordHash, mustChangePassword: false });

    const revokedOthers = await this.sessions.revokeAllForUser(user.id, authenticated.sessionId);
    this.logger.log(`Senha alterada por ${user.email}; ${revokedOthers} outra(s) sessão(ões) encerrada(s).`);

    return { revokedOthers };
  }

  /** Revalida o usuário do banco (o guard carrega a versão da sessão). */
  async me(authenticated: AuthenticatedUser): Promise<AuthenticatedUser> {
    const user = await this.requireUser(authenticated.id);
    return toAuthenticatedUser(user, authenticated.sessionId);
  }

  private async requireUser(id: string): Promise<User> {
    const user = await this.users.findById(id);
    if (!user || !user.active) {
      throw new UnauthorizedException('Sessão inválida. Faça login novamente.');
    }
    return user;
  }
}

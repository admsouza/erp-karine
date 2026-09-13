import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import type { Role } from '../../../generated/prisma/client.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import type { AuthenticatedUser } from '../entities/authenticated-user.entity.js';
import { toAdminUser, type AdminUser } from '../entities/admin-user.entity.js';
import type { CreateUserDto, ListUsersQueryDto } from '../dto/user-admin.dto.js';
import { UserRepository } from '../repositories/user.repository.js';
import { SessionService } from './session.service.js';

const BCRYPT_COST = 10;
const ULTIMO_ADMIN = 'O sistema precisa de pelo menos um administrador ativo.';

export interface AdminUserComSessoes extends AdminUser {
  /** Quantas sessões foram encerradas pela operação (inativação/reativação). */
  sessoesEncerradas: number;
}

/**
 * Administração de usuários.
 *
 * Vive no módulo `auth` porque é ele o dono da tabela `User` — criar um módulo
 * `users` separado faria dois módulos escreverem na mesma tabela, o que a regra
 * de dependência do projeto proíbe.
 *
 * Toda alteração revoga sessões quando faz sentido (inativação e troca de senha)
 * e é registrada na trilha de auditoria (módulo `audit`).
 */
@Injectable()
export class UserAdminService {
  constructor(
    private readonly users: UserRepository,
    private readonly sessions: SessionService,
    private readonly audit: AuditTrailService,
  ) {}

  async list(query: ListUsersQueryDto) {
    const pagina = await this.users.findManyWithFilters({
      search: query.search?.trim() || undefined,
      role: query.role,
      active: query.active === undefined ? undefined : query.active === 'true',
      page: query.page,
      pageSize: query.pageSize,
    });
    return { ...pagina, items: pagina.items.map(toAdminUser) };
  }

  async create(dto: CreateUserDto, ator: AuthenticatedUser): Promise<AdminUser> {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }
    const criado = await this.users.create({
      name: dto.name.trim(),
      email,
      role: dto.role,
      passwordHash: await bcrypt.hash(dto.password, BCRYPT_COST),
      // Senha combinada por fora do sistema: obriga a troca no primeiro acesso.
      mustChangePassword: true,
    });
    await this.audit.record({
      actorUserId: ator.id,
      actorName: ator.name,
      actorEmail: ator.email,
      module: 'auth',
      entityType: 'User',
      entityId: criado.id,
      action: 'CREATED',
      changes: [
        { field: 'name', before: null, after: criado.name },
        { field: 'email', before: null, after: criado.email },
        { field: 'role', before: null, after: criado.role },
      ],
    });
    return toAdminUser(criado);
  }

  async changeRole(id: string, role: Role, ator: AuthenticatedUser): Promise<AdminUser> {
    const alvo = await this.requireUser(id);
    if (alvo.role === role) {
      throw new BadRequestException('O usuário já tem este perfil.');
    }
    if (alvo.id === ator.id && role !== 'ADMIN') {
      throw new BadRequestException('Você não pode remover o seu próprio acesso de administrador.');
    }
    if (alvo.role === 'ADMIN' && alvo.active && role !== 'ADMIN' && (await this.users.countActiveAdmins()) <= 1) {
      throw new ConflictException(ULTIMO_ADMIN);
    }
    const atualizado = await this.users.update(id, { role });
    await this.audit.record({
      actorUserId: ator.id, actorName: ator.name, actorEmail: ator.email,
      module: 'auth', entityType: 'User', entityId: id, action: 'UPDATED',
      changes: [{ field: 'role', before: alvo.role, after: role }],
    });
    return toAdminUser(atualizado);
  }

  async setActive(id: string, active: boolean, ator: AuthenticatedUser): Promise<AdminUserComSessoes> {
    const alvo = await this.requireUser(id);
    if (alvo.active === active) {
      throw new BadRequestException(active ? 'O usuário já está ativo.' : 'O usuário já está inativo.');
    }
    if (!active && alvo.id === ator.id) {
      throw new BadRequestException('Você não pode inativar o seu próprio usuário.');
    }
    if (!active && alvo.role === 'ADMIN' && (await this.users.countActiveAdmins()) <= 1) {
      throw new ConflictException(ULTIMO_ADMIN);
    }
    const atualizado = await this.users.update(id, { active });
    const sessoesEncerradas = active ? 0 : await this.sessions.revokeAllForUser(id);
    await this.audit.record({
      actorUserId: ator.id, actorName: ator.name, actorEmail: ator.email,
      module: 'auth', entityType: 'User', entityId: id, action: 'UPDATED',
      reason: active ? 'Reativação de usuário' : 'Inativação de usuário',
      changes: [{ field: 'active', before: alvo.active, after: active }],
    });
    return { ...toAdminUser(atualizado), sessoesEncerradas };
  }

  async resetPassword(id: string, password: string, ator: AuthenticatedUser): Promise<{ id: string; sessoesEncerradas: number }> {
    const alvo = await this.requireUser(id);
    await this.users.update(id, { passwordHash: await bcrypt.hash(password, BCRYPT_COST), mustChangePassword: true });
    const sessoesEncerradas = await this.sessions.revokeAllForUser(id);
    await this.audit.record({
      actorUserId: ator.id, actorName: ator.name, actorEmail: ator.email,
      module: 'auth', entityType: 'User', entityId: id, action: 'UPDATED',
      reason: 'Redefinição de senha pelo administrador',
      // Nunca registrar a senha: só o fato de a credencial ter sido trocada.
      changes: [{ field: 'passwordHash', before: 'anterior', after: 'redefinida' }],
    });
    return { id: alvo.id, sessoesEncerradas };
  }

  private async requireUser(id: string) {
    const alvo = await this.users.findById(id);
    if (!alvo) throw new NotFoundException('Usuário não encontrado.');
    return alvo;
  }
}

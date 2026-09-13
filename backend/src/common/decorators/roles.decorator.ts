import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/client.js';

export const ROLES_KEY = 'roles';

/**
 * Restringe o handler (ou o controller) aos perfis informados.
 *
 * A checagem é feita pelo `RolesGuard`, que roda **depois** do guard de sessão —
 * ou seja, o perfil vem do usuário já autenticado, nunca do corpo da requisição.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

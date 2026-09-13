import type { Role, User } from '../../../generated/prisma/client.js';

/** Usuário autenticado anexado à requisição pelo guard de sessão. */
export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  sessionId: string;
}

export function toAuthenticatedUser(user: User, sessionId: string): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
    sessionId,
  };
}

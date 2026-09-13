import type { User } from '../../../generated/prisma/client.js';

/** Usuário exposto na administração — nunca inclui hash de senha. */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export function toAdminUser(user: User): AdminUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    mustChangePassword: user.mustChangePassword,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

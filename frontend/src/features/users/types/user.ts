export const ROLES = { ADMIN: 'Administrador', USER: 'Usuário' } as const;
export type Role = keyof typeof ROLES;

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface UsersPage {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
}

export const SITUACOES = { true: 'Ativos', false: 'Inativos' } as const;

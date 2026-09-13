import { http } from '../../../shared/api/http-client';
import type { AuthResponse, AuthUser } from '../types/auth';

/** Autenticação: o cookie de sessão é httpOnly, então nada de token no JS. */
export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await http.post<AuthResponse>('/auth/login', { email, password });
  return data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const { data } = await http.get<AuthResponse>('/auth/me');
    return data.user;
  } catch {
    // 401 = sem sessão; não é erro de aplicação.
    return null;
  }
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<number> {
  const { data } = await http.post<{ ok: true; revokedOthers: number }>('/auth/password', {
    currentPassword,
    newPassword,
  });
  return data.revokedOthers;
}

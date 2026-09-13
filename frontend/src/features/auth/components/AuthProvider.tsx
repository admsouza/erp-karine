import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { changePassword as changePasswordRequest, fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../api/auth-api';
import { AuthContext, type AuthContextValue } from '../context/auth-context';
import type { AuthUser } from '../types/auth';

/**
 * Sessão da aplicação. O cookie é httpOnly: o frontend só sabe o que a API
 * responde em `/auth/me`; nenhum token fica acessível ao JavaScript.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;
    fetchCurrentUser()
      .then((atual) => {
        if (ativo) setUser(atual);
      })
      .finally(() => {
        if (ativo) setLoading(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  // O cliente HTTP avisa quando alguma chamada leva 401 (sessão expirada).
  useEffect(() => {
    const aoExpirar = () => setUser(null);
    window.addEventListener('auth:unauthorized', aoExpirar);
    return () => window.removeEventListener('auth:unauthorized', aoExpirar);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const autenticado = await loginRequest(email, password);
    setUser(autenticado);
    return autenticado;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const revogadas = await changePasswordRequest(currentPassword, newPassword);
    setUser((atual) => (atual ? { ...atual, mustChangePassword: false } : atual));
    return revogadas;
  }, []);

  const valor = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout, changePassword }),
    [user, loading, login, logout, changePassword],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

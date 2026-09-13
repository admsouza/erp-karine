import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from '../context/auth-context';

/** Acesso à sessão atual (usuário, login, logout, troca de senha). */
export function useAuth(): AuthContextValue {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth precisa estar dentro de <AuthProvider>.');
  return contexto;
}

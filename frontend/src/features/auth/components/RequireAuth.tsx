import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Bloqueia as telas internas sem sessão e força a troca da senha temporária
 * antes de liberar o sistema.
 */
export function RequireAuth() {
  const { user, loading } = useAuth();
  const local = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        Verificando sessão…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ de: local.pathname }} />;
  }

  if (user.mustChangePassword && local.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />;
  }

  return <Outlet />;
}

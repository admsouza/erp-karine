import { useAuth } from '../../auth/hooks/useAuth';
import { Button } from '../../../shared/components/Button';
import { Card } from '../../../shared/components/Card';

/**
 * Barreira de rota para perfis específicos.
 *
 * O backend continua sendo a autoridade (as rotas de auditoria devolvem 403 para
 * outros perfis); isto evita mostrar uma tela que só daria erro.
 */
export function RequireRole({ role, children }: { role: 'ADMIN' | 'USER'; children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Card>
        <p className="py-8 text-center text-sm text-slate-500">Verificando permissão…</p>
      </Card>
    );
  }

  if (!user || user.role !== role) {
    return (
      <Card>
        <div className="py-8 text-center">
          <h2 className="text-sm font-semibold text-slate-800">Acesso restrito</h2>
          <p className="mt-1 text-sm text-slate-500">Esta área é exclusiva do perfil administrador.</p>
          <Button className="mt-4" variant="secondary" onClick={() => window.history.back()}>Voltar</Button>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}

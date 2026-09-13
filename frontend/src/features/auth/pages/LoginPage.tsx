import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { describeApiError } from '../../../shared/api/http-client';
import { useAuth } from '../hooks/useAuth';

interface EstadoNavegacao {
  de?: string;
}

export function LoginPage() {
  const { user, loading, login } = useAuth();
  const local = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const destino = (local.state as EstadoNavegacao | null)?.de ?? '/';

  if (!loading && user) {
    return <Navigate to={user.mustChangePassword ? '/trocar-senha' : destino} replace />;
  }

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await login(email.trim(), password);
    } catch (falha) {
      setErro(describeApiError(falha));
      setPassword('');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-600 text-lg font-semibold text-white">
            EC
          </div>
          <h1 className="text-xl font-semibold text-slate-900">ERP Clínica</h1>
          <p className="mt-1 text-sm text-slate-500">Acesse com seu e-mail e senha.</p>
        </div>

        <form onSubmit={enviar} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-4">
            <Input
              label="E-mail"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@clinica.com.br"
            />
            <Input
              label="Senha"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {erro && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {erro}
            </p>
          )}

          <Button type="submit" className="mt-6 w-full justify-center" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-400">
          Sessão de 7 dias com renovação automática. Acesso restrito à equipe da clínica.
        </p>
      </div>
    </div>
  );
}

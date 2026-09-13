import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { describeApiError } from '../../../shared/api/http-client';
import { useAuth } from '../hooks/useAuth';

export function ChangePasswordPage() {
  const { user, changePassword, logout } = useAuth();
  const navegar = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const obrigatoria = Boolean(user?.mustChangePassword);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setSucesso(null);

    if (newPassword !== confirmacao) {
      setErro('A confirmação não confere com a nova senha.');
      return;
    }

    setEnviando(true);
    try {
      const revogadas = await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmacao('');
      setSucesso(
        revogadas > 0
          ? `Senha alterada. ${revogadas} outra(s) sessão(ões) foram encerradas.`
          : 'Senha alterada com sucesso.',
      );
      if (obrigatoria) navegar('/', { replace: true });
    } catch (falha) {
      setErro(describeApiError(falha));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">
            {obrigatoria ? 'Defina sua senha' : 'Alterar senha'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {obrigatoria
              ? 'Sua senha é temporária. Escolha uma senha só sua para liberar o sistema.'
              : 'Mínimo de 8 caracteres, com letras e números.'}
          </p>

          <form onSubmit={enviar} className="mt-5 space-y-4">
            <Input
              label="Senha atual"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <Input
              label="Nova senha"
              type="password"
              autoComplete="new-password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              autoComplete="new-password"
              required
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
            />

            {erro && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {erro}
              </p>
            )}
            {sucesso && (
              <p role="status" className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {sucesso}
              </p>
            )}

            <Button type="submit" className="w-full justify-center" disabled={enviando}>
              {enviando ? 'Salvando…' : 'Salvar nova senha'}
            </Button>
          </form>

          {!obrigatoria && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <button type="button" onClick={() => navegar(-1)} className="text-slate-500 hover:text-slate-700">
                Voltar
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="text-slate-500 hover:text-slate-700"
              >
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

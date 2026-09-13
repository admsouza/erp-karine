import { useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Pagination } from '../../../shared/components/Pagination';
import { Select } from '../../../shared/components/Select';
import { formatDateTimeRecife } from '../../../shared/utils/format';
import { changeUserRole, setUserActive } from '../api/users-api';
import { ResetPasswordModal, UserModal } from '../components/UserModals';
import { useUsers } from '../hooks/useUsers';
import { ROLES, type AdminUser, type Role } from '../types/user';

export function UsersPage() {
  const lista = useUsers();
  const [novoUsuario, setNovoUsuario] = useState(false);
  const [redefinir, setRedefinir] = useState<AdminUser | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  async function executar(id: string, trabalho: () => Promise<unknown>) {
    setBusy(id);
    setActionError(null);
    try {
      await trabalho();
      lista.recarregar();
    } catch (falha) {
      setActionError(describeApiError(falha));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuários"
        description="Quem acessa o sistema, com qual perfil e desde quando. As políticas de acesso por usuário entram na sequência."
        actions={<Button onClick={() => setNovoUsuario(true)}>Novo usuário</Button>}
      />

      <Card>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            lista.aplicar();
          }}
        >
          <Input label="Busca" hint="Nome ou e-mail" value={lista.filtros.search} onChange={(e) => lista.alterar('search', e.target.value)} />
          <Select
            label="Perfil"
            value={lista.filtros.role}
            onChange={(e) => lista.alterar('role', e.target.value)}
            options={[{ value: '', label: 'Todos os perfis' }, ...Object.entries(ROLES).map(([value, label]) => ({ value, label }))]}
          />
          <Select
            label="Situação"
            value={lista.filtros.active}
            onChange={(e) => lista.alterar('active', e.target.value)}
            options={[{ value: '', label: 'Ativos e inativos' }, { value: 'true', label: 'Ativos' }, { value: 'false', label: 'Inativos' }]}
          />
          <div className="flex items-end gap-2">
            <Button type="submit" loading={lista.loading}>Filtrar</Button>
            <Button type="button" variant="secondary" onClick={lista.limpar}>Limpar</Button>
          </div>
        </form>
      </Card>

      {actionError ? <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{actionError}</p> : null}

      {lista.loading ? (
        <Card><p className="py-8 text-center text-sm text-slate-500">Carregando usuários…</p></Card>
      ) : lista.error ? (
        <Card><p className="py-8 text-center text-sm text-rose-600">{lista.error}</p></Card>
      ) : lista.items.length === 0 ? (
        <Card><EmptyState title="Nenhum usuário" description="Ajuste os filtros ou cadastre um novo usuário." /></Card>
      ) : (
        <Card>
          <ul className="space-y-3">
            {lista.items.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-slate-900">{item.name}</h2>
                      <Badge tone={item.role === 'ADMIN' ? 'info' : 'neutral'}>{ROLES[item.role]}</Badge>
                      <Badge tone={item.active ? 'success' : 'danger'}>{item.active ? 'Ativo' : 'Inativo'}</Badge>
                      {item.mustChangePassword ? <Badge tone="warning">Troca de senha pendente</Badge> : null}
                    </div>
                    <p className="mt-1 truncate text-sm text-slate-600">{item.email}</p>
                    <p className="text-xs text-slate-400">
                      Último acesso: {item.lastLoginAt ? formatDateTimeRecife(item.lastLoginAt) : 'nunca'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => setRedefinir(item)}>Redefinir senha</Button>
                    <Button
                      size="sm"
                      variant={item.active ? 'danger' : 'secondary'}
                      disabled={busy === item.id}
                      onClick={() => executar(item.id, () => setUserActive(item.id, !item.active))}
                    >
                      {item.active ? 'Inativar' : 'Reativar'}
                    </Button>
                  </div>
                </div>

                <div className="mt-3 max-w-xs">
                  <Select
                    label="Perfil de acesso"
                    value={item.role}
                    disabled={busy === item.id}
                    onChange={(e) => executar(item.id, () => changeUserRole(item.id, e.target.value as Role))}
                    options={Object.entries(ROLES).map(([value, label]) => ({ value, label }))}
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="-mx-5 -mb-4 mt-4">
            <Pagination page={lista.page} pageSize={lista.pageSize} total={lista.total} totalPages={lista.totalPages} onChange={lista.irPara} />
          </div>
        </Card>
      )}

      <UserModal open={novoUsuario} onClose={() => setNovoUsuario(false)} onSaved={lista.recarregar} />
      <ResetPasswordModal usuario={redefinir} onClose={() => setRedefinir(null)} onSaved={lista.recarregar} />
    </div>
  );
}

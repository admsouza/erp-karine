import { useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import { createUser, resetUserPassword } from '../api/users-api';
import { ROLES, type AdminUser, type Role } from '../types/user';

/** Cadastro de usuário: senha inicial combinada por fora e troca obrigatória no primeiro acesso. */
export function UserModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('USER');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function fechar() {
    setName(''); setEmail(''); setPassword(''); setRole('USER'); setError(null);
    onClose();
  }

  async function submit(evento: FormEvent) {
    evento.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createUser({ name, email, password, role });
      onSaved();
      fechar();
    } catch (falha) {
      setError(describeApiError(falha));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Novo usuário"
      onClose={fechar}
      footer={<><Button variant="secondary" onClick={fechar}>Cancelar</Button><Button form="user-form" type="submit" loading={saving}>Criar usuário</Button></>}
    >
      <form id="user-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
        <Input className="sm:col-span-2" label="Nome" required value={name} onChange={(e) => setName(e.target.value)} />
        <Input className="sm:col-span-2" label="E-mail" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Senha inicial" type="password" required hint="Mínimo de 8 caracteres, com letras e números." value={password} onChange={(e) => setPassword(e.target.value)} />
        <Select label="Perfil" value={role} onChange={(e) => setRole(e.target.value as Role)} options={Object.entries(ROLES).map(([value, label]) => ({ value, label }))} />
        <p className="sm:col-span-2 text-xs text-slate-500">O usuário será obrigado a trocar a senha no primeiro acesso.</p>
        {error ? <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </form>
    </Modal>
  );
}

/** Redefinição de senha pelo administrador (senha temporária + troca obrigatória). */
export function ResetPasswordModal({ usuario, onClose, onSaved }: { usuario: AdminUser | null; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(evento: FormEvent) {
    evento.preventDefault();
    if (!usuario) return;
    setSaving(true);
    setError(null);
    try {
      await resetUserPassword(usuario.id, password);
      onSaved();
      setPassword('');
      onClose();
    } catch (falha) {
      setError(describeApiError(falha));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={!!usuario}
      title="Redefinir senha"
      onClose={() => { setPassword(''); setError(null); onClose(); }}
      footer={<><Button variant="secondary" onClick={() => { setPassword(''); setError(null); onClose(); }}>Cancelar</Button><Button form="reset-form" type="submit" loading={saving}>Redefinir</Button></>}
    >
      <form id="reset-form" className="grid gap-4" onSubmit={submit}>
        <p className="text-sm text-slate-600">
          Nova senha temporária para <strong>{usuario?.name}</strong>. As sessões abertas serão encerradas e o usuário
          será obrigado a trocar a senha no próximo acesso.
        </p>
        <Input label="Senha temporária" type="password" required hint="Mínimo de 8 caracteres, com letras e números." value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
      </form>
    </Modal>
  );
}

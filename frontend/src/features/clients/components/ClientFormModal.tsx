import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { describeApiError } from '../../../shared/api/http-client';
import { createClient, updateClient } from '../api/clients-api';
import type { Client, ClientInput } from '../types/client';

interface ClientFormModalProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM: ClientInput = {
  fullName: '',
  cpf: '',
  birthDate: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  notes: '',
};

function toForm(client: Client | null): ClientInput {
  if (!client) return EMPTY_FORM;
  return {
    fullName: client.fullName,
    cpf: client.cpf ?? '',
    birthDate: client.birthDate ? client.birthDate.slice(0, 10) : '',
    phone: client.phone ?? '',
    whatsapp: client.whatsapp ?? '',
    email: client.email ?? '',
    address: client.address ?? '',
    notes: client.notes ?? '',
  };
}

export function ClientFormModal({ open, client, onClose, onSaved }: ClientFormModalProps) {
  const [form, setForm] = useState<ClientInput>(() => toForm(client));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const update = (field: keyof ClientInput) => (value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function handleSubmit() {
    setSaving(true);
    setError(null);
    try {
      if (client) {
        await updateClient(client.id, form);
      } else {
        await createClient(form);
      }
      onSaved();
      onClose();
    } catch (requestError) {
      setError(describeApiError(requestError));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={client ? 'Editar cliente' : 'Novo cliente'}
      size="lg"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving}>
            Salvar
          </Button>
        </div>
      }
    >
      {error ? (
        <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Nome completo"
            value={form.fullName}
            onChange={(event) => update('fullName')(event.target.value)}
            required
          />
        </div>
        <Input label="CPF" value={form.cpf} onChange={(e) => update('cpf')(e.target.value)} />
        <Input
          label="Data de nascimento"
          type="date"
          value={form.birthDate}
          onChange={(e) => update('birthDate')(e.target.value)}
        />
        <Input label="Telefone" value={form.phone} onChange={(e) => update('phone')(e.target.value)} />
        <Input
          label="WhatsApp"
          value={form.whatsapp}
          onChange={(e) => update('whatsapp')(e.target.value)}
        />
        <div className="sm:col-span-2">
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => update('email')(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Input
            label="Endereço"
            value={form.address}
            onChange={(e) => update('address')(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="client-notes">
            Observações
          </label>
          <textarea
            id="client-notes"
            rows={3}
            className="field-input"
            value={form.notes}
            onChange={(e) => update('notes')(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

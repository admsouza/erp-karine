import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { PageHeader } from '../../../shared/components/PageHeader';
import { describeApiError } from '../../../shared/api/http-client';
import { formatCpf, formatDate, formatPhone } from '../../../shared/utils/format';
import { inactivateClient, reactivateClient } from '../api/clients-api';
import { ClientFormModal } from '../components/ClientFormModal';
import { ClientStatusBadge } from '../components/ClientStatusBadge';
import { useClient } from '../hooks/useClient';

/** Seções que dependem de outros módulos: cada módulo continua dono da sua regra. */
const FUTURE_SECTIONS = [
  { title: 'Agendamentos', phase: 'Fase 4' },
  { title: 'Assinaturas', phase: 'Fase 5' },
  { title: 'Histórico financeiro', phase: 'Fase 6' },
  { title: 'Protocolos', phase: 'Fase 7' },
  { title: 'Recomendações de exames', phase: 'Fase 8' },
];

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { client, loading, error, reload } = useClient(id);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function toggleActive() {
    if (!client) return;
    setBusy(true);
    setActionError(null);
    try {
      if (client.active) {
        await inactivateClient(client.id);
      } else {
        await reactivateClient(client.id);
      }
      reload();
    } catch (requestError) {
      setActionError(describeApiError(requestError));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="py-10 text-center text-sm text-slate-500">Carregando cliente…</p>;
  }

  if (error || !client) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error ?? 'Cliente não encontrado.'}
        </p>
        <Link to="/clientes" className="text-sm font-medium text-brand-700 hover:underline">
          ← Voltar para a lista de clientes
        </Link>
      </div>
    );
  }

  const fields: Array<{ label: string; value: string }> = [
    { label: 'CPF', value: formatCpf(client.cpf) },
    { label: 'Data de nascimento', value: formatDate(client.birthDate) },
    { label: 'Telefone', value: formatPhone(client.phone) },
    { label: 'WhatsApp', value: formatPhone(client.whatsapp) },
    { label: 'E-mail', value: client.email ?? '-' },
    { label: 'Endereço', value: client.address ?? '-' },
    { label: 'Cadastro', value: formatDate(client.createdAt) },
  ];

  return (
    <div className="space-y-6">
      <nav className="text-sm text-slate-500">
        <Link to="/clientes" className="hover:text-brand-700">
          Clientes
        </Link>
        <span className="px-2">/</span>
        <span className="text-slate-700">{client.fullName}</span>
      </nav>

      <PageHeader
        title={client.fullName}
        description={client.active ? 'Cliente ativo' : 'Cliente inativo'}
        actions={
          <div className="flex items-center gap-2">
            <ClientStatusBadge active={client.active} />
            <Button variant="secondary" onClick={() => setEditing(true)}>
              Editar
            </Button>
            <Button variant={client.active ? 'danger' : 'primary'} loading={busy} onClick={toggleActive}>
              {client.active ? 'Inativar' : 'Reativar'}
            </Button>
          </div>
        }
      />

      {actionError ? (
        <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{actionError}</p>
      ) : null}

      <Card title="Dados pessoais">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <div key={field.label}>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{field.label}</dt>
              <dd className="mt-1 text-sm text-slate-800">{field.value}</dd>
            </div>
          ))}
        </dl>
        {client.notes ? (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <dt className="text-xs uppercase tracking-wide text-slate-500">Observações</dt>
            <dd className="mt-1 whitespace-pre-line text-sm text-slate-800">{client.notes}</dd>
          </div>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {FUTURE_SECTIONS.map((section) => (
          <Card key={section.title} title={section.title}>
            <EmptyState
              title="Ainda não implementado"
              description={`Este bloco é alimentado pelo módulo correspondente (${section.phase}).`}
            />
          </Card>
        ))}
      </div>

      <ClientFormModal
        key={editing ? 'edit' : 'closed'}
        open={editing}
        client={client}
        onClose={() => setEditing(false)}
        onSaved={reload}
      />
    </div>
  );
}

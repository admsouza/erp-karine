import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { Pagination } from '../../../shared/components/Pagination';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Select } from '../../../shared/components/Select';
import { describeApiError } from '../../../shared/api/http-client';
import { inactivateClient, reactivateClient } from '../api/clients-api';
import { ClientFormModal } from '../components/ClientFormModal';
import { ClientsTable } from '../components/ClientsTable';
import { useClients } from '../hooks/useClients';
import type { Client } from '../types/client';

const STATUS_OPTIONS = [
  { value: 'true', label: 'Somente ativos' },
  { value: 'false', label: 'Somente inativos' },
  { value: '', label: 'Todos' },
];

export function ClientsPage() {
  const {
    data,
    loading,
    error,
    changePage,
    search,
    changeSearch,
    activeFilter,
    changeFilter,
    reload,
  } = useClients();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setModalOpen(true);
  }

  async function toggleActive(client: Client) {
    setBusyId(client.id);
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
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Cadastro e histórico dos pacientes da clínica."
        actions={<Button onClick={openCreate}>Novo cliente</Button>}
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <Input
            label="Buscar"
            placeholder="Nome, CPF, telefone ou WhatsApp"
            value={search}
            onChange={(event) => changeSearch(event.target.value)}
          />
          <Select
            label="Situação"
            options={STATUS_OPTIONS}
            value={activeFilter}
            onChange={(event) => changeFilter(event.target.value as 'true' | 'false' | '')}
          />
        </div>
      </Card>

      {actionError ? (
        <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{actionError}</p>
      ) : null}

      <Card>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Carregando clientes…</p>
        ) : error ? (
          <p className="px-4 py-8 text-center text-sm text-rose-600">{error}</p>
        ) : data && data.items.length > 0 ? (
          <>
            <ClientsTable
              clients={data.items}
              busyId={busyId}
              onEdit={openEdit}
              onToggleActive={toggleActive}
            />
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              totalPages={data.totalPages}
              onChange={changePage}
            />
          </>
        ) : (
          <EmptyState
            title="Nenhum cliente encontrado"
            description="Ajuste a busca ou cadastre o primeiro cliente da clínica."
          />
        )}
      </Card>

      <ClientFormModal
        key={editing?.id ?? 'new'}
        open={modalOpen}
        client={editing}
        onClose={() => setModalOpen(false)}
        onSaved={reload}
      />
    </div>
  );
}

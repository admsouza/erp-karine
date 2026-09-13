import { Link } from 'react-router-dom';
import { Button } from '../../../shared/components/Button';
import { formatCpf, formatDate, formatPhone } from '../../../shared/utils/format';
import type { Client } from '../types/client';
import { ClientStatusBadge } from './ClientStatusBadge';

interface ClientsTableProps {
  clients: Client[];
  busyId: string | null;
  onEdit: (client: Client) => void;
  onToggleActive: (client: Client) => void;
}

export function ClientsTable({ clients, busyId, onEdit, onToggleActive }: ClientsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">CPF</th>
            <th className="px-4 py-3 font-medium">Contato</th>
            <th className="px-4 py-3 font-medium">Cadastro</th>
            <th className="px-4 py-3 font-medium">Situação</th>
            <th className="px-4 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <Link
                  to={`/clientes/${client.id}`}
                  className="font-medium text-slate-800 hover:text-brand-700"
                >
                  {client.fullName}
                </Link>
              </td>
              <td className="px-4 py-3 text-slate-600">{formatCpf(client.cpf)}</td>
              <td className="px-4 py-3 text-slate-600">
                {formatPhone(client.whatsapp ?? client.phone)}
              </td>
              <td className="px-4 py-3 text-slate-600">{formatDate(client.createdAt)}</td>
              <td className="px-4 py-3">
                <ClientStatusBadge active={client.active} />
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(client)}>
                    Editar
                  </Button>
                  <Button
                    variant={client.active ? 'danger' : 'secondary'}
                    size="sm"
                    loading={busyId === client.id}
                    onClick={() => onToggleActive(client)}
                  >
                    {client.active ? 'Inativar' : 'Reativar'}
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

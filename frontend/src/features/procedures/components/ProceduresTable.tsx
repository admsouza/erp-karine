import { Link } from 'react-router-dom';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { formatCentsToBRL } from '../../../shared/utils/format';
import type { Procedure } from '../types/procedure';

interface ProceduresTableProps {
  procedures: Procedure[];
  busyId: string | null;
  onEdit: (procedure: Procedure) => void;
  onToggleActive: (procedure: Procedure) => void;
}

function duracao(minutos: number | null): string {
  if (!minutos) return '—';
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

export function ProceduresTable({ procedures, busyId, onEdit, onToggleActive }: ProceduresTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Procedimento</th>
            <th className="px-4 py-3 font-medium">Duração</th>
            <th className="px-4 py-3 font-medium">Valor vigente</th>
            <th className="px-4 py-3 font-medium">Situação</th>
            <th className="px-4 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {procedures.map((procedure) => (
            <tr key={procedure.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-3">
                <Link
                  to={`/procedimentos/${procedure.id}`}
                  className="block font-medium text-slate-800 hover:text-brand-700 hover:underline"
                >
                  {procedure.name}
                </Link>
                {procedure.description && (
                  <span className="mt-0.5 block max-w-[420px] truncate text-xs text-slate-500">
                    {procedure.description}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 text-slate-600">{duracao(procedure.durationMinutes)}</td>
              <td className="px-4 py-3 text-slate-600">
                {procedure.currentValueCents === null ? (
                  <span className="text-slate-400">sem valor</span>
                ) : (
                  formatCentsToBRL(procedure.currentValueCents)
                )}
              </td>
              <td className="px-4 py-3">
                <Badge tone={procedure.active ? 'success' : 'neutral'}>
                  {procedure.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </td>
              <td className="px-4 py-3">
                <div className="flex justify-end gap-2">
                  <Link
                    to={`/procedimentos/${procedure.id}`}
                    className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Valores
                  </Link>
                  <Button variant="ghost" size="sm" onClick={() => onEdit(procedure)}>
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === procedure.id}
                    onClick={() => onToggleActive(procedure)}
                  >
                    {procedure.active ? 'Inativar' : 'Reativar'}
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

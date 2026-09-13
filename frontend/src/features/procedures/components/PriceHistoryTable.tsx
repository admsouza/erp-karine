import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { formatCentsToBRL, formatDateOnly } from '../../../shared/utils/format';
import { PROCEDURE_UNITS, type ProcedurePrice, type ProcedureUnit } from '../types/procedure';

interface PriceHistoryTableProps {
  prices: ProcedurePrice[];
  unit: ProcedureUnit;
  busyId: string | null;
  onEdit: (price: ProcedurePrice) => void;
  onRemove: (price: ProcedurePrice) => void;
}

/** Série histórica de valores do procedimento, do mais recente para o mais antigo. */
export function PriceHistoryTable({ prices, unit, busyId, onEdit, onRemove }: PriceHistoryTableProps) {
  const singular = PROCEDURE_UNITS.find((u) => u.value === unit)?.singular ?? 'sessão';

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3 font-medium">Valor unitário</th>
            <th className="px-4 py-3 font-medium">Vigência</th>
            <th className="px-4 py-3 font-medium">Observação</th>
            <th className="px-4 py-3 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {prices.map((price) => {
            const vigente = price.validTo === null;
            return (
              <tr key={price.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">
                      {formatCentsToBRL(price.valueCents)}
                      <span className="ml-1 text-xs font-normal text-slate-500">/ {singular}</span>
                    </span>
                    {vigente && <Badge tone="success">Vigente</Badge>}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateOnly(price.validFrom)} até{' '}
                  {vigente ? 'hoje em diante' : formatDateOnly(price.validTo)}
                </td>
                <td className="max-w-[200px] truncate px-4 py-3 text-slate-500">{price.note ?? '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {vigente ? (
                      <Button variant="ghost" size="sm" disabled={busyId === price.id} onClick={() => onEdit(price)}>
                        Alterar valor
                      </Button>
                    ) : (
                      <span className="px-2 py-1 text-xs text-slate-400" title="Vigência encerrada não é editável">
                        encerrada
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busyId === price.id}
                      onClick={() => onRemove(price)}
                      title="Remover vigência (correção)"
                    >
                      Remover
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

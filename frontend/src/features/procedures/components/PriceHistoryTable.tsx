import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { formatCentsToBRL, formatDateOnly } from '../../../shared/utils/format';
import type { ProcedurePrice } from '../types/procedure';

interface PriceHistoryTableProps {
  prices: ProcedurePrice[];
  busyId: string | null;
  onRemove: (price: ProcedurePrice) => void;
}

/** Série histórica de valores do procedimento, do mais recente para o mais antigo. */
export function PriceHistoryTable({ prices, busyId, onRemove }: PriceHistoryTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] text-left text-sm">
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
                    <span className="font-medium text-slate-800">{formatCentsToBRL(price.valueCents)}</span>
                    {vigente && <Badge tone="success">Vigente</Badge>}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDateOnly(price.validFrom)} até {vigente ? 'hoje em diante' : formatDateOnly(price.validTo)}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-500">{price.note ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busyId === price.id}
                    onClick={() => onRemove(price)}
                    title="Remover vigência (correção)"
                  >
                    Remover
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

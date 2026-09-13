import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { PageHeader } from '../../../shared/components/PageHeader';
import { formatCentsToBRL, formatDate } from '../../../shared/utils/format';
import { NewPriceModal } from '../components/NewPriceModal';
import { PriceHistoryTable } from '../components/PriceHistoryTable';
import { useProcedure } from '../hooks/useProcedure';

function duracao(minutos: number | null | undefined): string {
  if (!minutos) return '—';
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto} min`;
}

/** Procedimento com a série histórica de valores (vigências). */
export function ProcedureDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { procedure, prices, loading, erro, erroAcao, reload, removePrice } = useProcedure(id);
  const [modalAberto, setModalAberto] = useState(false);
  const [removendo, setRemovendo] = useState<string | null>(null);

  if (loading) {
    return <p className="px-4 py-10 text-center text-sm text-slate-500">Carregando procedimento…</p>;
  }

  if (erro || !procedure) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{erro ?? 'Procedimento não encontrado.'}</p>
        <Link to="/procedimentos" className="text-sm text-brand-700 hover:underline">
          Voltar para o catálogo
        </Link>
      </div>
    );
  }

  const ultimaVigencia = prices[0] ?? null;

  async function remover(priceId: string) {
    setRemovendo(priceId);
    await removePrice(priceId);
    setRemovendo(null);
  }

  return (
    <div className="space-y-6">
      <Link to="/procedimentos" className="inline-block text-sm text-slate-500 hover:text-slate-700">
        ← Procedimentos
      </Link>

      <PageHeader
        title={procedure.name}
        description={procedure.description ?? 'Sem descrição cadastrada.'}
        actions={<Button onClick={() => setModalAberto(true)}>Novo valor</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Valor unitário vigente</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">
            {procedure.currentValueCents === null ? '—' : formatCentsToBRL(procedure.currentValueCents)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {ultimaVigencia
              ? `Vigência atual desde ${ultimaVigencia.validFrom.slice(0, 10).split('-').reverse().join('/')}`
              : 'Sem valor cadastrado'}
          </p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Duração aproximada</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{duracao(procedure.durationMinutes)}</p>
          <p className="mt-1 text-xs text-slate-500">Sugestão de horário na agenda</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Situação</p>
          <p className="mt-1">
            <Badge tone={procedure.active ? 'success' : 'neutral'}>
              {procedure.active ? 'Ativo' : 'Inativo'}
            </Badge>
          </p>
          <p className="mt-1 text-xs text-slate-500">Cadastrado em {formatDate(procedure.createdAt)}</p>
        </Card>
      </div>

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-800">Histórico de valores</h2>
          <span className="text-xs text-slate-500">
            {prices.length} vigência{prices.length === 1 ? '' : 's'} — o histórico não é reescrito
          </span>
        </div>

        {erroAcao && <p className="mb-3 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{erroAcao}</p>}

        <Card>
          {prices.length > 0 ? (
            <PriceHistoryTable
              prices={prices}
              busyId={removendo}
              onRemove={(price) => void remover(price.id)}
            />
          ) : (
            <EmptyState
              title="Sem valores cadastrados"
              description="Cadastre o primeiro valor para começar a série histórica deste procedimento."
            />
          )}
        </Card>
      </div>

      <NewPriceModal
        open={modalAberto}
        procedureId={procedure.id}
        valorAtualCents={procedure.currentValueCents}
        ultimaVigencia={ultimaVigencia}
        onClose={() => setModalAberto(false)}
        onSaved={reload}
      />
    </div>
  );
}

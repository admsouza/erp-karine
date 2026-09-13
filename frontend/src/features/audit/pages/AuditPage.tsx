import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Pagination } from '../../../shared/components/Pagination';
import { Select } from '../../../shared/components/Select';
import { formatCentsToBRL, formatDate, formatDateTimeRecife } from '../../../shared/utils/format';
import { useAudit } from '../hooks/useAudit';
import {
  actorLabel,
  auditActionLabel,
  auditEntityLabel,
  auditFieldLabel,
  auditModuleLabel,
  paymentMethodLabel,
  type AuditChange,
  type AuditEvent,
} from '../types/audit';

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const TOM_ACAO: Record<string, 'info' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  CREATED: 'success',
  UPDATED: 'info',
  CANCELLED: 'danger',
};

/** Valor de um campo auditado, no formato do tipo dele (dinheiro, data, texto). */
function valorAuditado(campo: string, valor: string | number | null): string {
  if (valor === null || valor === '') return '—';
  if (typeof valor === 'number') return campo.endsWith('Cents') ? formatCentsToBRL(valor) : String(valor);
  if (campo === 'paymentMethod') return paymentMethodLabel(valor);
  if (ISO_DATE_TIME.test(valor)) return campo === 'paidAt' ? formatDate(valor) : formatDateTimeRecife(valor);
  return valor;
}

function EventoCard({ evento }: { evento: AuditEvent }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={TOM_ACAO[evento.action] ?? 'neutral'}>{auditActionLabel(evento.action)}</Badge>
        <span className="text-sm font-semibold text-slate-800">{actorLabel(evento)}</span>
        <span className="text-xs text-slate-500">{formatDateTimeRecife(evento.createdAt)}</span>
        <span className="text-xs text-slate-400">
          {auditModuleLabel(evento.module)} · {auditEntityLabel(evento.entityType)}
        </span>
      </div>

      {evento.reason ? <p className="mt-2 text-sm text-slate-700">Motivo: {evento.reason}</p> : null}

      <ul className="mt-2 space-y-1">
        {evento.changes.map((mudanca: AuditChange) => (
          <li key={`${evento.id}-${mudanca.field}`} className="text-sm text-slate-700">
            {auditFieldLabel(mudanca.field)}:{' '}
            <span className="text-slate-500 line-through">{valorAuditado(mudanca.field, mudanca.before)}</span>
            {' → '}
            <strong className="font-semibold text-slate-900">{valorAuditado(mudanca.field, mudanca.after)}</strong>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function AuditPage() {
  const trilha = useAudit();

  const autorOpcoes = [
    { value: '', label: 'Todos os usuários' },
    ...trilha.opcoes.actors.map((ator) => ({
      value: ator.id,
      label: ator.name ?? ator.email ?? ator.id,
    })),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Auditoria"
        description="Trilha imutável de alterações: quem mudou, quando, o que mudou e por quê."
        actions={<Button variant="secondary" onClick={trilha.recarregar}>Atualizar</Button>}
      />

      <Card>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          onSubmit={(evento) => {
            evento.preventDefault();
            trilha.aplicar();
          }}
        >
          <Select label="Usuário" value={trilha.filtros.actorUserId} onChange={(e) => trilha.alterar('actorUserId', e.target.value)} options={autorOpcoes} />
          <Select
            label="Módulo"
            value={trilha.filtros.module}
            onChange={(e) => trilha.alterar('module', e.target.value)}
            options={[{ value: '', label: 'Todos os módulos' }, ...trilha.opcoes.modules.map((valor) => ({ value: valor, label: auditModuleLabel(valor) }))]}
          />
          <Select
            label="Tipo de registro"
            value={trilha.filtros.entityType}
            onChange={(e) => trilha.alterar('entityType', e.target.value)}
            options={[{ value: '', label: 'Todos os tipos' }, ...trilha.opcoes.entityTypes.map((valor) => ({ value: valor, label: auditEntityLabel(valor) }))]}
          />
          <Select
            label="Ação"
            value={trilha.filtros.action}
            onChange={(e) => trilha.alterar('action', e.target.value)}
            options={[{ value: '', label: 'Todas as ações' }, ...trilha.opcoes.actions.map((valor) => ({ value: valor, label: auditActionLabel(valor) }))]}
          />
          <Input label="De" type="date" value={trilha.filtros.from} onChange={(e) => trilha.alterar('from', e.target.value)} />
          <Input label="Até" type="date" value={trilha.filtros.to} onChange={(e) => trilha.alterar('to', e.target.value)} />
          <Input className="sm:col-span-2" label="Busca" hint="Motivo, nome do autor ou id do registro" value={trilha.filtros.search} onChange={(e) => trilha.alterar('search', e.target.value)} />
          <div className="flex items-end gap-2">
            <Button type="submit" loading={trilha.loading}>Filtrar</Button>
            <Button type="button" variant="secondary" onClick={trilha.limpar}>Limpar</Button>
          </div>
        </form>
      </Card>

      {trilha.loading ? (
        <Card><p className="py-8 text-center text-sm text-slate-500">Carregando trilha de auditoria…</p></Card>
      ) : trilha.error ? (
        <Card><p className="py-8 text-center text-sm text-rose-600">{trilha.error}</p></Card>
      ) : trilha.items.length === 0 ? (
        <Card>
          <EmptyState
            title={trilha.temFiltro ? 'Nenhuma alteração com esses filtros' : 'Nenhuma alteração registrada'}
            description={
              trilha.temFiltro
                ? 'Ajuste os filtros ou o período para ver outros registros.'
                : 'A trilha começa a registrar a partir da implantação da auditoria; alterações anteriores não têm histórico.'
            }
          />
        </Card>
      ) : (
        <Card>
          <ul className="space-y-3">{trilha.items.map((evento) => <EventoCard key={evento.id} evento={evento} />)}</ul>
          <div className="-mx-5 -mb-4 mt-4">
            <Pagination page={trilha.page} pageSize={trilha.pageSize} total={trilha.total} totalPages={trilha.totalPages} onChange={trilha.irPara} />
          </div>
        </Card>
      )}
    </div>
  );
}

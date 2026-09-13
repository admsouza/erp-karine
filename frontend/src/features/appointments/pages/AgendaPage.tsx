import { useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { PageHeader } from '../../../shared/components/PageHeader';
import { formatCentsToBRL, formatDate, formatTime, humanizeStatus, todayISO } from '../../../shared/utils/format';
import { changeAppointmentStatus } from '../api/appointments-api';
import { AppointmentFormModal } from '../components/AppointmentFormModal';
import { useAgenda, type AgendaView } from '../hooks/useAgenda';
import type { Appointment } from '../types/appointment';
import type { AppointmentStatus } from '../types/appointment-status';

const tones = { AGENDADO: 'info', CONFIRMADO: 'warning', REALIZADO: 'success', CANCELADO: 'danger', FALTOU: 'neutral' } as const;
function actions(item: Appointment): { status: AppointmentStatus; label: string }[] {
  if (item.status === 'AGENDADO') return [{ status: 'CONFIRMADO', label: 'Confirmar' }, { status: 'CANCELADO', label: 'Cancelar' }, { status: 'FALTOU', label: 'Faltou' }];
  if (item.status === 'CONFIRMADO') return [{ status: 'REALIZADO', label: 'Realizado' }, { status: 'CANCELADO', label: 'Cancelar' }, { status: 'FALTOU', label: 'Faltou' }];
  return [];
}

export function AgendaPage() {
  const agenda = useAgenda(todayISO()); const [modal, setModal] = useState(false); const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  async function transition(item: Appointment, status: AppointmentStatus) {
    setBusy(item.id); setActionError(null);
    try { await changeAppointmentStatus(item.id, status); agenda.reload(); } catch (failure) { setActionError(describeApiError(failure)); } finally { setBusy(null); }
  }
  return <div className="space-y-5">
    <PageHeader title="Agenda" description="Atendimentos organizados por dia ou semana." actions={<Button onClick={() => setModal(true)}>Novo agendamento</Button>} />
    <Card>
      <div className="grid gap-3 sm:grid-cols-[auto_220px] sm:items-end sm:justify-between">
        <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1">
          {(['day', 'week'] as AgendaView[]).map((view) => <button key={view} onClick={() => agenda.changeView(view)} className={`rounded-md px-4 py-2 text-sm font-medium ${agenda.view === view ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>{view === 'day' ? 'Dia' : 'Semana'}</button>)}
        </div>
        <Input label={agenda.view === 'day' ? 'Data' : 'Semana de'} type="date" value={agenda.date} onChange={(event) => agenda.changeDate(event.target.value)} />
      </div>
    </Card>
    {actionError ? <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{actionError}</p> : null}
    {agenda.loading ? <Card><p className="py-8 text-center text-sm text-slate-500">Carregando agenda…</p></Card> : agenda.error ? <Card><p className="py-8 text-center text-sm text-rose-600">{agenda.error}</p></Card> : agenda.items.length === 0 ? <Card><EmptyState title="Agenda livre" description="Não há atendimentos neste período." /></Card> : <div className="space-y-3">
      {agenda.items.map((item) => <article key={item.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid sm:grid-cols-[90px_1fr_auto] sm:items-center sm:gap-4">
        <div className="mb-3 flex items-center justify-between sm:mb-0 sm:block"><strong className="text-xl text-slate-900">{formatTime(item.scheduledAt)}</strong>{agenda.view === 'week' ? <span className="text-xs text-slate-500 sm:block">{formatDate(item.scheduledAt)}</span> : null}</div>
        <div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{item.clientName}</h2><Badge tone={tones[item.status]}>{humanizeStatus(item.status)}</Badge></div><p className="mt-1 text-sm text-slate-600">{item.procedureName} · {item.quantity} × {formatCentsToBRL(item.unitValueCents)}</p><p className="text-xs text-slate-400">{item.professional || 'Profissional não informado'} · Total {formatCentsToBRL(item.valueCents)}</p></div>
        <div className="mt-3 flex flex-wrap gap-2 sm:mt-0 sm:justify-end">{actions(item).map((action) => <Button key={action.status} size="sm" variant={action.status === 'CANCELADO' ? 'danger' : 'secondary'} disabled={busy === item.id} onClick={() => transition(item, action.status)}>{action.label}</Button>)}</div>
      </article>)}
    </div>}
    <AppointmentFormModal open={modal} onClose={() => setModal(false)} onSaved={agenda.reload} />
  </div>;
}

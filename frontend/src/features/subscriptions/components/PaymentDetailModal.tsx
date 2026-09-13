import { useEffect, useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import {
  formatCentsToBRL,
  formatDate,
  formatDateTimeRecife,
  parseBRLToCents,
  recifeDateInputValue,
  recifeTimeValue,
} from '../../../shared/utils/format';
import { paymentTimeline, updatePayment } from '../api/subscriptions-api';
import { PAYMENT_METHODS, type AuditChange, type AuditEvent, type Payment, type PaymentMethod } from '../types/subscription';

/** Rótulos de negócio dos campos auditados (a trilha nunca mostra nome técnico). */
const FIELD_LABELS: Record<string, string> = {
  amountCents: 'Valor',
  paidAt: 'Data',
  paymentMethod: 'Forma de pagamento',
  notes: 'Observação',
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Criação',
  UPDATED: 'Alteração',
  CANCELLED: 'Cancelamento',
};

export function PaymentDetailModal({ subscriptionId, payment, onClose, onSaved }: {
  subscriptionId: string;
  payment: Payment | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  if (!payment) return null;
  return <PaymentDetail subscriptionId={subscriptionId} payment={payment} onClose={onClose} onSaved={onSaved} />;
}

function valorLegivel(field: string, value: string | number | boolean | null): string {
  if (value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (field === 'amountCents' && typeof value === 'number') return formatCentsToBRL(value);
  if (field === 'paidAt') return formatDate(String(value));
  if (field === 'paymentMethod') return PAYMENT_METHODS[value as PaymentMethod] ?? String(value);
  return String(value);
}

function PaymentDetail({ subscriptionId, payment, onClose, onSaved }: {
  subscriptionId: string;
  payment: Payment;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState(payment);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(formatCentsToBRL(payment.amountCents));
  const [date, setDate] = useState(recifeDateInputValue(payment.paidAt));
  const [method, setMethod] = useState<PaymentMethod>(payment.paymentMethod);
  const [notes, setNotes] = useState(payment.notes ?? '');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historia, setHistoria] = useState<{ loading: boolean; items: AuditEvent[]; total: number; error: string | null }>({ loading: true, items: [], total: 0, error: null });

  useEffect(() => {
    const controller = new AbortController();
    paymentTimeline(subscriptionId, current.id, { page: 1, pageSize: 50 }, controller.signal)
      .then((data) => setHistoria({ loading: false, items: data.items, total: data.total, error: null }))
      .catch((falha: unknown) => {
        if (controller.signal.aborted) return;
        setHistoria({ loading: false, items: [], total: 0, error: describeApiError(falha) });
      });
    return () => controller.abort();
  }, [subscriptionId, current.id]);

  /*
   * `paidAt` guarda data **e** hora. O formulário mexe só na data: quando o dia não
   * muda, o horário original é preservado para não registrar uma alteração falsa.
   */
  function paidAtParaEnviar(): string {
    if (date === recifeDateInputValue(current.paidAt)) return current.paidAt;
    return `${date}T${recifeTimeValue(current.paidAt)}:00-03:00`;
  }

  async function submit(evento: FormEvent) {
    evento.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const atualizado = await updatePayment(subscriptionId, current.id, {
        amountCents: parseBRLToCents(amount),
        paidAt: paidAtParaEnviar(),
        paymentMethod: method,
        notes: notes.trim() || undefined,
        reason: reason.trim(),
      });
      setCurrent(atualizado);
      setEditing(false);
      setReason('');
      const data = await paymentTimeline(subscriptionId, atualizado.id, { page: 1, pageSize: 50 });
      setHistoria({ loading: false, items: data.items, total: data.total, error: null });
      onSaved();
    } catch (falha) {
      setError(describeApiError(falha));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      size="lg"
      title="Pagamento"
      onClose={onClose}
      footer={editing ? (
        <>
          <Button variant="secondary" onClick={() => { setEditing(false); setError(null); }}>Cancelar</Button>
          <Button form="payment-edit-form" type="submit" loading={saving}>Salvar alteração</Button>
        </>
      ) : (
        <>
          <Button variant="secondary" onClick={onClose}>Fechar</Button>
          <Button onClick={() => setEditing(true)}>Editar pagamento</Button>
        </>
      )}
    >
      {editing ? (
        <form id="payment-edit-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
          <Input label="Valor pago" required value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Input label="Data" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          <Select className="sm:col-span-2" label="Forma de pagamento" value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} options={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label }))} />
          <Input className="sm:col-span-2" label="Observação" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <Input className="sm:col-span-2" label="Motivo da alteração" required hint="Fica registrado na linha do tempo junto com o seu nome." value={reason} onChange={(e) => setReason(e.target.value)} />
          {error ? <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </form>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div><dt className="field-label">Valor pago</dt><dd className="text-base font-semibold text-slate-900">{formatCentsToBRL(current.amountCents)}</dd></div>
          <div><dt className="field-label">Data</dt><dd className="text-sm text-slate-700">{formatDate(current.paidAt)}</dd></div>
          <div><dt className="field-label">Forma de pagamento</dt><dd className="text-sm text-slate-700">{PAYMENT_METHODS[current.paymentMethod]}</dd></div>
          <div><dt className="field-label">Observação</dt><dd className="text-sm text-slate-700">{current.notes || '—'}</dd></div>
          {error ? <p className="sm:col-span-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
        </dl>
      )}

      <section className="mt-6 border-t border-slate-100 pt-4">
        <h3 className="text-sm font-semibold text-slate-700">Linha do tempo</h3>
        <p className="mt-1 text-xs text-slate-400">Registro imutável: quem alterou, quando e o que mudou.</p>
        {historia.loading ? <p className="mt-3 text-sm text-slate-500">Carregando histórico…</p>
          : historia.error ? <p className="mt-3 text-sm text-rose-600">{historia.error}</p>
          : historia.items.length === 0 ? <p className="mt-3 text-sm text-slate-500">Nenhuma alteração registrada desde a implantação da auditoria.</p>
          : (
            <ol className="mt-3 space-y-3">
              {historia.items.map((evento) => (
                <li key={evento.id} className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="info">{ACTION_LABELS[evento.action] ?? evento.action}</Badge>
                    <span className="text-sm font-medium text-slate-800">{evento.actorName ?? evento.actorEmail ?? 'Usuário removido'}</span>
                    <span className="text-xs text-slate-500">{formatDateTimeRecife(evento.createdAt)}</span>
                  </div>
                  {evento.reason ? <p className="mt-1 text-xs text-slate-600">Motivo: {evento.reason}</p> : null}
                  <ul className="mt-2 space-y-1">
                    {evento.changes.map((mudanca: AuditChange) => (
                      <li key={`${evento.id}-${mudanca.field}`} className="text-sm text-slate-700">
                        {FIELD_LABELS[mudanca.field] ?? mudanca.field}: <span className="text-slate-500 line-through">{valorLegivel(mudanca.field, mudanca.before)}</span>{' → '}<strong className="font-semibold text-slate-900">{valorLegivel(mudanca.field, mudanca.after)}</strong>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          )}
      </section>
    </Modal>
  );
}

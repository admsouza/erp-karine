import { useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import { formatCentsToBRL, parseBRLToCents } from '../../../shared/utils/format';
import { deleteFinancialTransaction, updateFinancialTransaction } from '../api/financial-api';
import { FINANCIAL_STATUSES, PAYMENT_METHODS, TRANSACTION_TYPES, type FinancialTransaction, type FinancialStatus, type PaymentMethod, type TransactionType } from '../types/financial';

export function AdminTransactionModal({ item, mode, onClose, onSaved }: { item: FinancialTransaction; mode: 'edit' | 'delete'; onClose: () => void; onSaved: () => void }) {
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(formatCentsToBRL(item.amountCents));
  const [date, setDate] = useState(item.date.slice(0, 10));
  const [type, setType] = useState<TransactionType>(item.type);
  const [status, setStatus] = useState<FinancialStatus>(item.status);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(item.paymentMethod);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!reason.trim()) { setError('Informe o motivo para registrar na auditoria.'); return; }
    setSaving(true);
    try {
      if (mode === 'delete') await deleteFinancialTransaction(item.id, reason.trim());
      else {
        const amountCents = parseBRLToCents(amount);
        if (amountCents <= 0) { setError('Informe um valor maior que zero.'); setSaving(false); return; }
        await updateFinancialTransaction(item.id, { description, amountCents, date, type, status, paymentMethod, reason: reason.trim() });
      }
      onSaved(); onClose();
    } catch (failure) { setError(describeApiError(failure)); } finally { setSaving(false); }
  }
  const deleting = mode === 'delete';
  return <Modal open title={deleting ? 'Excluir lançamento' : 'Alterar lançamento'} onClose={onClose}>
    <form className="space-y-4" onSubmit={submit}>
      {deleting ? <p className="text-sm text-slate-600">O lançamento sairá do fluxo operacional, mas permanecerá na auditoria como excluído.</p> : <div className="grid gap-4 sm:grid-cols-2">
        <Input className="sm:col-span-2" label="Descrição" required value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input label="Valor (R$)" required inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <Input label="Data" required type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <Select label="Tipo" value={type} onChange={(e) => setType(e.target.value as TransactionType)} options={Object.entries(TRANSACTION_TYPES).map(([value, label]) => ({ value, label }))} />
        <Select label="Situação" value={status} onChange={(e) => setStatus(e.target.value as FinancialStatus)} options={Object.entries(FINANCIAL_STATUSES).filter(([value]) => value !== 'CANCELADO').map(([value, label]) => ({ value, label }))} />
        <Select label="Forma de pagamento" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} options={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({ value, label }))} />
      </div>}
      <Input label={deleting ? 'Motivo da exclusão' : 'Motivo da alteração'} required hint="Fica registrado na auditoria com seu nome." value={reason} onChange={(e) => setReason(e.target.value)} />
      {error ? <p role="alert" className="text-sm text-rose-600">{error}</p> : null}
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" variant={deleting ? 'danger' : 'primary'} disabled={saving}>{saving ? 'Salvando…' : deleting ? 'Excluir lançamento' : 'Salvar alteração'}</Button></div>
    </form>
  </Modal>;
}

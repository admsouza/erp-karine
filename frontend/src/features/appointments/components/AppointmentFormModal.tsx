import { useEffect, useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import { appointmentOptions, createAppointment } from '../api/appointments-api';
import type { AppointmentOption } from '../types/appointment';

export function AppointmentFormModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [clients, setClients] = useState<AppointmentOption[]>([]); const [procedures, setProcedures] = useState<AppointmentOption[]>([]);
  const [clientId, setClientId] = useState(''); const [procedureId, setProcedureId] = useState('');
  const [scheduledAt, setScheduledAt] = useState(''); const [quantity, setQuantity] = useState('1');
  const [professional, setProfessional] = useState(''); const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) appointmentOptions().then((data) => { setClients(data.clients); setProcedures(data.procedures); }).catch((failure) => setError(describeApiError(failure))); }, [open]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await createAppointment({ clientId, procedureId, scheduledAt: new Date(scheduledAt).toISOString(), quantity: Number(quantity), professional: professional || undefined, notes: notes || undefined });
      onSaved(); onClose();
    } catch (failure) { setError(describeApiError(failure)); } finally { setSaving(false); }
  }
  const selected = procedures.find((item) => item.id === procedureId);
  return <Modal open={open} title="Novo agendamento" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button type="submit" form="appointment-form" loading={saving}>Agendar</Button></>}>
    <form id="appointment-form" className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
      <Select className="sm:col-span-2" label="Cliente" required value={clientId} onChange={(e) => setClientId(e.target.value)} options={[{ value: '', label: 'Selecione o cliente' }, ...clients.map((item) => ({ value: item.id, label: item.name }))]} />
      <Select className="sm:col-span-2" label="Procedimento" required value={procedureId} onChange={(e) => setProcedureId(e.target.value)} options={[{ value: '', label: 'Selecione o procedimento' }, ...procedures.map((item) => ({ value: item.id, label: item.name }))]} />
      {selected?.currentValueCents === null ? <p className="sm:col-span-2 text-sm text-amber-700">Este procedimento ainda não possui valor vigente.</p> : null}
      <Input label="Data e hora" type="datetime-local" required value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
      <Input label="Quantidade" type="number" min="1" max="10000" required value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      <Input className="sm:col-span-2" label="Profissional" value={professional} onChange={(e) => setProfessional(e.target.value)} />
      <Input className="sm:col-span-2" label="Observação" value={notes} onChange={(e) => setNotes(e.target.value)} />
      {error ? <p className="sm:col-span-2 text-sm text-rose-600">{error}</p> : null}
    </form>
  </Modal>;
}
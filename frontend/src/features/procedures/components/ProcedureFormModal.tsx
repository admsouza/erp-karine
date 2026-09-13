import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { describeApiError } from '../../../shared/api/http-client';
import { createProcedure, updateProcedure } from '../api/procedures-api';
import type { Procedure, ProcedureInput } from '../types/procedure';

interface ProcedureFormModalProps {
  open: boolean;
  procedure: Procedure | null;
  onClose: () => void;
  onSaved: () => void;
}

interface Formulario {
  name: string;
  description: string;
  durationMinutes: string;
  valorReais: string;
}

const VAZIO: Formulario = { name: '', description: '', durationMinutes: '', valorReais: '' };

function paraFormulario(procedure: Procedure | null): Formulario {
  if (!procedure) return VAZIO;
  return {
    name: procedure.name,
    description: procedure.description ?? '',
    durationMinutes: procedure.durationMinutes ? String(procedure.durationMinutes) : '',
    valorReais: procedure.defaultValueCents
      ? (procedure.defaultValueCents / 100).toFixed(2).replace('.', ',')
      : '',
  };
}

/** Converte "180,00" / "180.00" / "180" em centavos, sem float. */
function paraCentavos(valor: string): number | undefined {
  const limpo = valor.trim();
  if (!limpo) return undefined;
  const normalizado = limpo.replace(/\./g, '').replace(',', '.');
  const numero = Number(normalizado);
  if (!Number.isFinite(numero) || numero < 0) return undefined;
  return Math.round(numero * 100);
}

export function ProcedureFormModal({ open, procedure, onClose, onSaved }: ProcedureFormModalProps) {
  const [form, setForm] = useState<Formulario>(() => paraFormulario(procedure));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const campo = (chave: keyof Formulario) => (valor: string) =>
    setForm((atual) => ({ ...atual, [chave]: valor }));

  async function enviar() {
    setSalvando(true);
    setErro(null);

    const minutos = form.durationMinutes.trim() ? Number(form.durationMinutes) : undefined;
    if (minutos !== undefined && (!Number.isInteger(minutos) || minutos <= 0)) {
      setErro('Duração deve ser um número inteiro de minutos.');
      setSalvando(false);
      return;
    }

    const payload: ProcedureInput = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      durationMinutes: minutos,
      defaultValueCents: paraCentavos(form.valorReais),
    };

    try {
      if (procedure) {
        await updateProcedure(procedure.id, payload);
      } else {
        await createProcedure(payload);
      }
      onSaved();
      onClose();
    } catch (falha) {
      setErro(describeApiError(falha));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={procedure ? 'Editar procedimento' : 'Novo procedimento'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={() => void enviar()} disabled={salvando || form.name.trim().length < 3}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Nome"
          required
          value={form.name}
          onChange={(evento) => campo('name')(evento.target.value)}
          placeholder="Limpeza de pele profunda"
        />

        <div>
          <label htmlFor="procedure-description" className="field-label">
            Descrição
          </label>
          <textarea
            id="procedure-description"
            rows={3}
            className="field-input"
            value={form.description}
            onChange={(evento) => campo('description')(evento.target.value)}
            placeholder="O que está incluso, produtos, cuidados…"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Duração (minutos)"
            type="number"
            min={5}
            max={600}
            value={form.durationMinutes}
            onChange={(evento) => campo('durationMinutes')(evento.target.value)}
            placeholder="60"
          />
          <Input
            label="Valor padrão (R$)"
            value={form.valorReais}
            onChange={(evento) => campo('valorReais')(evento.target.value)}
            placeholder="180,00"
          />
        </div>

        {erro && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}

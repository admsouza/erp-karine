import { useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import { formatCentsToBRL, parseBRLToCents } from '../../../shared/utils/format';
import { updateMaintenanceItem } from '../api/maintenance-api';
import {
  MAINTENANCE_FIELDS,
  MAINTENANCE_TYPES,
  type MaintenanceItem,
} from '../types/maintenance';

/**
 * Edição de um cadastro pelo hub. Os campos vêm da configuração por tipo e o
 * módulo dono continua validando — aqui só montamos o formulário e enviamos
 * os campos que podem ser corrigidos no hub.
 */
export function MaintenanceEditModal({
  item,
  onClose,
  onSaved,
}: {
  item: MaintenanceItem;
  onClose: () => void;
  onSaved: () => void;
}) {
  const campos = MAINTENANCE_FIELDS[item.type];
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const campo of campos) {
      const atual = item.values[campo.key];
      inicial[campo.key] =
        campo.moeda && typeof atual === 'number'
          ? formatCentsToBRL(atual)
          : atual === null || atual === undefined
            ? ''
            : String(atual);
    }
    return inicial;
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(evento: FormEvent) {
    evento.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const corpo: Record<string, string | number> = {};
      for (const campo of campos) {
        const bruto = valores[campo.key]?.trim() ?? '';
        if (!bruto) continue;
        corpo[campo.key] = campo.moeda ? parseBRLToCents(bruto) : bruto;
      }
      await updateMaintenanceItem(item.type, item.id, corpo);
      onSaved();
      onClose();
    } catch (falha) {
      setError(describeApiError(falha));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title={`Editar ${MAINTENANCE_TYPES[item.type]}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {campos.map((campo) =>
          campo.options ? (
            <Select
              key={campo.key}
              label={campo.label}
              value={valores[campo.key] ?? ''}
              onChange={(e) =>
                setValores({ ...valores, [campo.key]: e.target.value })
              }
              options={campo.options}
            />
          ) : (
            <Input
              key={campo.key}
              label={campo.label}
              value={valores[campo.key] ?? ''}
              inputMode={campo.moeda ? 'decimal' : undefined}
              onChange={(e) =>
                setValores({ ...valores, [campo.key]: e.target.value })
              }
            />
          ),
        )}
        <p className="text-xs text-slate-500">
          A alteração é registrada na auditoria com o valor anterior e o novo. O
          valor unitário de procedimento tem vigência própria — ajuste na tela do
          procedimento.
        </p>
        {error ? (
          <p role="alert" className="text-sm text-rose-600">
            {error}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando…' : 'Salvar alteração'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

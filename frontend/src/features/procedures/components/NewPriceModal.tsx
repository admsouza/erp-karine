import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { describeApiError } from '../../../shared/api/http-client';
import { formatCentsToBRL, formatDateOnly, todayISO } from '../../../shared/utils/format';
import { addProcedurePrice } from '../api/procedures-api';
import type { ProcedurePrice } from '../types/procedure';

interface NewPriceModalProps {
  open: boolean;
  procedureId: string;
  valorAtualCents: number | null;
  ultimaVigencia: ProcedurePrice | null;
  onClose: () => void;
  onSaved: () => void;
}

/** Converte "180,00" em centavos, sem float. */
function paraCentavos(valor: string): number | undefined {
  const limpo = valor.trim();
  if (!limpo) return undefined;
  const numero = Number(limpo.replace(/\./g, '').replace(',', '.'));
  if (!Number.isFinite(numero) || numero < 0) return undefined;
  return Math.round(numero * 100);
}

/**
 * Novo valor do procedimento: cria uma vigência nova e fecha a anterior na data
 * informada, preservando a série histórica.
 */
export function NewPriceModal({
  open,
  procedureId,
  valorAtualCents,
  ultimaVigencia,
  onClose,
  onSaved,
}: NewPriceModalProps) {
  const [valor, setValor] = useState('');
  const [validFrom, setValidFrom] = useState(() => todayISO());
  const [note, setNote] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const minimo = ultimaVigencia ? ultimaVigencia.validFrom.slice(0, 10) : null;

  async function enviar() {
    const valueCents = paraCentavos(valor);
    if (valueCents === undefined) {
      setErro('Informe o novo valor (ex.: 180,00).');
      return;
    }
    if (minimo && validFrom <= minimo) {
      setErro(`A vigência precisa começar depois de ${formatDateOnly(minimo)}, que é a mais recente.`);
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      await addProcedurePrice(procedureId, { valueCents, validFrom, note: note.trim() || undefined });
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
      title="Novo valor"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={() => void enviar()} disabled={salvando || !valor.trim()}>
            {salvando ? 'Salvando…' : 'Aplicar valor'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          Valor atual: <strong>{formatCentsToBRL(valorAtualCents)}</strong>. O valor atual será encerrado no
          dia anterior ao início da nova vigência e continuará no histórico.
        </p>

        <Input
          label="Novo valor unitário (R$)"
          required
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          placeholder="180,00"
        />

        <Input
          label="A partir de"
          type="date"
          required
          min={minimo ? undefined : undefined}
          value={validFrom}
          onChange={(evento) => setValidFrom(evento.target.value)}
        />

        <Input
          label="Observação"
          value={note}
          onChange={(evento) => setNote(evento.target.value)}
          placeholder="Reajuste anual, promoção de inverno…"
        />

        {minimo && (
          <p className="text-xs text-slate-500">
            A vigência mais recente começa em {formatDateOnly(minimo)}; a nova precisa começar depois dessa data.
          </p>
        )}

        {erro && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {erro}
          </p>
        )}
      </div>
    </Modal>
  );
}

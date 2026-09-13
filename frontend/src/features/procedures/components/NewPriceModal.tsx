import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { describeApiError } from '../../../shared/api/http-client';
import { formatCentsToBRL, formatDateOnly, todayISO } from '../../../shared/utils/format';
import { addProcedurePrice, updateProcedurePrice } from '../api/procedures-api';
import type { ProcedurePrice } from '../types/procedure';

interface PriceModalProps {
  open: boolean;
  procedureId: string;
  valorAtualCents: number | null;
  ultimaVigencia: ProcedurePrice | null;
  /** Quando informado, o modal corrige a vigência atual em vez de criar outra. */
  price?: ProcedurePrice | null;
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

function paraCampo(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : (cents / 100).toFixed(2).replace('.', ',');
}

/**
 * Dois modos:
 * - **novo valor** (`price` ausente): cria uma vigência nova e fecha a anterior;
 * - **correção** (`price` informado): altera o valor/observação da vigência atual,
 *   usado quando o valor já gravado precisa ser ajustado.
 */
export function NewPriceModal({
  open,
  procedureId,
  valorAtualCents,
  ultimaVigencia,
  price = null,
  onClose,
  onSaved,
}: PriceModalProps) {
  const corrigindo = Boolean(price);
  const [valor, setValor] = useState(() => (corrigindo ? paraCampo(price?.valueCents) : ''));
  const [validFrom, setValidFrom] = useState(() => todayISO());
  const [note, setNote] = useState(() => (corrigindo ? (price?.note ?? '') : ''));
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const minimo = ultimaVigencia ? ultimaVigencia.validFrom.slice(0, 10) : null;

  async function enviar() {
    const valueCents = paraCentavos(valor);
    if (valueCents === undefined) {
      setErro('Informe o valor (ex.: 900,00).');
      return;
    }
    if (!corrigindo && minimo && validFrom <= minimo) {
      setErro(`A vigência precisa começar depois de ${formatDateOnly(minimo)}, que é a mais recente.`);
      return;
    }

    setSalvando(true);
    setErro(null);
    try {
      if (corrigindo && price) {
        await updateProcedurePrice(procedureId, price.id, { valueCents, note: note.trim() });
      } else {
        await addProcedurePrice(procedureId, { valueCents, validFrom, note: note.trim() || undefined });
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
      title={corrigindo ? 'Alterar valor atual' : 'Novo valor'}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={() => void enviar()} disabled={salvando || !valor.trim()}>
            {salvando ? 'Salvando…' : corrigindo ? 'Salvar correção' : 'Aplicar valor'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
          {corrigindo ? (
            <>
              Corrigindo a vigência que começou em{' '}
              <strong>{formatDateOnly(price?.validFrom)}</strong> (valor atual{' '}
              {formatCentsToBRL(valorAtualCents)}). Vigências já encerradas não podem ser alteradas.
            </>
          ) : (
            <>
              Valor atual: <strong>{formatCentsToBRL(valorAtualCents)}</strong>. O valor atual será encerrado no
              dia anterior ao início da nova vigência e continuará no histórico.
            </>
          )}
        </p>

        <Input
          label="Valor unitário (R$)"
          required
          value={valor}
          onChange={(evento) => setValor(evento.target.value)}
          placeholder="900,00"
        />

        {!corrigindo && (
          <Input
            label="A partir de"
            type="date"
            required
            value={validFrom}
            onChange={(evento) => setValidFrom(evento.target.value)}
          />
        )}

        <Input
          label="Observação"
          value={note}
          onChange={(evento) => setNote(evento.target.value)}
          placeholder="Reajuste anual, correção do cadastro…"
        />

        {!corrigindo && minimo && (
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

import { useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import {
  OUTRO_LOCAL,
  RESOURCE_KINDS,
  identificacaoEscolhida,
  identificacoesOpcoes,
  valorDaIdentificacao,
} from '../../../shared/data/locais-recurso';
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
 *
 * O **local do recurso** é o único com seletor de identificação: usa a mesma lista
 * do cadastro (espécie, bancos e maquinetas) e só pergunta o tipo quando o nome é
 * próprio — na lista sugerida o tipo já vem junto, então pedir de novo seria redundante.
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
  const ehLocal = item.type === 'RESOURCE_ACCOUNT';
  const [identificacao, setIdentificacao] = useState(() =>
    ehLocal
      ? valorDaIdentificacao(
          String(item.values.name ?? ''),
          (item.values.kind as never) ?? 'CASH',
        )
      : '',
  );
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
    if (ehLocal) {
      // Nome próprio só entra no texto quando a identificação não está na lista.
      inicial.nomeProprio =
        valorDaIdentificacao(
          String(item.values.name ?? ''),
          (item.values.kind as never) ?? 'CASH',
        ) === OUTRO_LOCAL
          ? String(item.values.name ?? '')
          : '';
    }
    return inicial;
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const nomeDoLocal =
    identificacao === OUTRO_LOCAL
      ? (valores.nomeProprio ?? '').trim()
      : (identificacaoEscolhida(identificacao)?.name ?? '');

  async function submit(evento: FormEvent) {
    evento.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const corpo: Record<string, string | number> = {};
      if (ehLocal) {
        corpo.name = nomeDoLocal;
        corpo.kind =
          identificacao === OUTRO_LOCAL
            ? valores.kind
            : (identificacaoEscolhida(identificacao)?.kind ?? valores.kind);
      } else {
        for (const campo of campos) {
          const bruto = valores[campo.key]?.trim() ?? '';
          if (!bruto) continue;
          corpo[campo.key] = campo.moeda ? parseBRLToCents(bruto) : bruto;
        }
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
        {ehLocal ? (
          <>
            <Select
              label="Identificação do local"
              value={identificacao}
              onChange={(e) => setIdentificacao(e.target.value)}
              options={identificacoesOpcoes()}
            />
            {identificacao === OUTRO_LOCAL ? (
              <>
                <Select
                  label="Tipo de local"
                  value={valores.kind ?? 'CASH'}
                  onChange={(e) => setValores({ ...valores, kind: e.target.value })}
                  options={Object.entries(RESOURCE_KINDS).map(([value, label]) => ({
                    value,
                    label,
                  }))}
                />
                <Input
                  label="Nome do local"
                  required
                  value={valores.nomeProprio ?? ''}
                  onChange={(e) =>
                    setValores({ ...valores, nomeProprio: e.target.value })
                  }
                />
              </>
            ) : null}
          </>
        ) : (
          campos.map((campo) =>
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
          )
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
          <Button type="submit" disabled={saving || (ehLocal && !nomeDoLocal)}>
            {saving ? 'Salvando…' : 'Salvar alteração'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

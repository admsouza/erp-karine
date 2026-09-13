import { useEffect, useState, type FormEvent } from 'react';
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
  type IdentificacaoLocal,
} from '../../../shared/data/locais-recurso';
import { formatCentsToBRL, parseBRLToCents } from '../../../shared/utils/format';
import {
  createMaintenanceItem,
  listAccountSuggestions,
  updateMaintenanceItem,
} from '../api/maintenance-api';
import {
  MAINTENANCE_FIELDS,
  MAINTENANCE_TYPES,
  type MaintenanceItem,
  type MaintenanceType,
} from '../types/maintenance';

/**
 * Edição de um cadastro pelo hub. Os campos vêm da configuração por tipo e o
 * módulo dono continua validando — aqui só montamos o formulário e enviamos
 * os campos que podem ser corrigidos no hub.
 *
 * O **local do recurso** usa o **catálogo de identificações** (o mesmo do cadastro, mantido
 * no próprio hub) e só pergunta o tipo quando o nome é próprio — na lista o tipo já vem junto.
 * A **identificação sugerida** em si é editada como texto: é ela que forma o catálogo.
 */
export function MaintenanceEditModal({
  item,
  type,
  onClose,
  onSaved,
}: {
  /** Ausente = criação (só o catálogo de identificações é criado pelo hub). */
  item?: MaintenanceItem;
  type: MaintenanceType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const editando = item !== undefined;
  const campos = MAINTENANCE_FIELDS[type];
  const ehLocal = type === 'RESOURCE_ACCOUNT' && editando;
  const [catalogo, setCatalogo] = useState<IdentificacaoLocal[]>([]);
  const [identificacao, setIdentificacao] = useState<string | null>(null);
  const [valores, setValores] = useState<Record<string, string>>(() => {
    const inicial: Record<string, string> = {};
    for (const campo of MAINTENANCE_FIELDS[type]) {
      const atual = item?.values[campo.key];
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

  useEffect(() => {
    if (!ehLocal) return;
    listAccountSuggestions()
      .then((sugestoes) =>
        setCatalogo(sugestoes.map((x) => ({ name: x.name, kind: x.kind }))),
      )
      .catch(() => setCatalogo([]));
  }, [ehLocal]);

  const nomeAtual = String(item?.values.name ?? '');
  const kindAtual = (item?.values.kind as IdentificacaoLocal['kind']) ?? 'CASH';
  const selecionada =
    identificacao ?? valorDaIdentificacao(catalogo, nomeAtual, kindAtual);
  const nomeDoLocal =
    selecionada === OUTRO_LOCAL
      ? (valores.nomeProprio ?? '').trim()
      : (identificacaoEscolhida(catalogo, selecionada)?.name ?? '');

  async function submit(evento: FormEvent) {
    evento.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const corpo: Record<string, string | number> = {};
      if (ehLocal) {
        corpo.name = nomeDoLocal;
        corpo.kind =
          selecionada === OUTRO_LOCAL
            ? valores.kind
            : (identificacaoEscolhida(catalogo, selecionada)?.kind ?? valores.kind);
      } else {
        for (const campo of campos) {
          const bruto = valores[campo.key]?.trim() ?? '';
          if (!bruto) continue;
          corpo[campo.key] = campo.moeda ? parseBRLToCents(bruto) : bruto;
        }
      }
      if (item) await updateMaintenanceItem(item.type, item.id, corpo);
      else
        await createMaintenanceItem(type, {
          name: String(corpo.name ?? ''),
          kind: corpo.kind === undefined ? undefined : String(corpo.kind),
        });
      onSaved();
      onClose();
    } catch (falha) {
      setError(describeApiError(falha));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open
      title={editando ? `Editar ${MAINTENANCE_TYPES[type]}` : `Nova ${MAINTENANCE_TYPES[type]}`}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={submit}>
        {ehLocal ? (
          <>
            <Select
              label="Identificação do local"
              value={selecionada}
              onChange={(e) => setIdentificacao(e.target.value)}
              options={identificacoesOpcoes(catalogo)}
            />
            {selecionada === OUTRO_LOCAL ? (
              <>
                <Select
                  label="Tipo de local"
                  value={valores.kind ?? kindAtual}
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
            {saving ? 'Salvando…' : editando ? 'Salvar alteração' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

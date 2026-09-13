import { useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import { updateResourceAccount } from '../api/cash-api';
import {
  OUTRO_LOCAL,
  RESOURCE_KINDS,
  identificacaoEscolhida,
  identificacoesOpcoes,
  valorDaIdentificacao,
} from '../../../shared/data/locais-recurso';
import type { ResourceAccount } from '../types/cash';



/**
 * Corrige a identificação do local. O saldo é ligado ao id do local, então renomear
 * não move valor nenhum — muda só como ele aparece (inclusive nos meses já fechados).
 * O componente é montado por local (`key`), então o estado inicial vem das props.
 */
export function EditResourceAccountModal({
  account,
  onClose,
  onSaved,
}: {
  account: ResourceAccount;
  onClose: () => void;
  onSaved: () => void;
}) {
  const inicial = valorDaIdentificacao(account.name, account.kind);
  const [idLocal, setIdLocal] = useState(inicial);
  const [outroNome, setOutroNome] = useState(
    inicial === OUTRO_LOCAL ? account.name : '',
  );
  const [kind, setKind] = useState<string>(account.kind);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nome =
    idLocal === OUTRO_LOCAL
      ? outroNome.trim()
      : (identificacaoEscolhida(idLocal)?.name ?? '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await updateResourceAccount(account.id, { name: nome, kind });
      onSaved();
      onClose();
    } catch (x) {
      setError(describeApiError(x));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open title="Editar local do recurso" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <Select
          label="Identificação do local"
          value={idLocal}
          onChange={(e) => {
            const escolhido = identificacaoEscolhida(e.target.value);
            setIdLocal(e.target.value);
            if (escolhido) setKind(escolhido.kind);
          }}
          options={identificacoesOpcoes()}
        />
        {/* O tipo só é perguntado no nome próprio: na lista sugerida ele já vem junto. */}
        {idLocal === OUTRO_LOCAL ? (
          <>
            <Select
              label="Tipo de local"
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              options={Object.entries(RESOURCE_KINDS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Input
              label="Nome do local"
              required
              value={outroNome}
              onChange={(e) => setOutroNome(e.target.value)}
            />
          </>
        ) : null}
        <p className="text-xs text-slate-500">
          Renomear não altera valores: o saldo é ligado ao local, não ao nome.
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
          <Button type="submit" disabled={saving || !nome}>
            {saving ? 'Salvando…' : 'Salvar alteração'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

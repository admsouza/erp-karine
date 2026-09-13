import { useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import { updateResourceAccount } from '../api/cash-api';
import {
  IDENTIFICACOES_LOCAL,
  OUTRO_LOCAL,
  RESOURCE_KINDS,
  type ResourceAccount,
} from '../types/cash';

function valorDaIdentificacao(account: ResourceAccount) {
  const conhecida = IDENTIFICACOES_LOCAL.find(
    (x) => x.name === account.name && x.kind === account.kind,
  );
  return conhecida ? `${conhecida.kind}:${conhecida.name}` : OUTRO_LOCAL;
}

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
  const [idLocal, setIdLocal] = useState(() => valorDaIdentificacao(account));
  const [outroNome, setOutroNome] = useState(() =>
    valorDaIdentificacao(account) === OUTRO_LOCAL ? account.name : '',
  );
  const [kind, setKind] = useState<string>(account.kind);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nome =
    idLocal === OUTRO_LOCAL
      ? outroNome.trim()
      : (IDENTIFICACOES_LOCAL.find((x) => `${x.kind}:${x.name}` === idLocal)
          ?.name ?? '');

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
            const escolhido = IDENTIFICACOES_LOCAL.find(
              (x) => `${x.kind}:${x.name}` === e.target.value,
            );
            setIdLocal(e.target.value);
            if (escolhido) setKind(escolhido.kind);
          }}
          options={[
            ...IDENTIFICACOES_LOCAL.map((x) => ({
              value: `${x.kind}:${x.name}`,
              label: `${x.name} · ${RESOURCE_KINDS[x.kind]}`,
            })),
            { value: OUTRO_LOCAL, label: 'Outro (digitar)' },
          ]}
        />
        <Select
          label="Tipo de local"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          options={Object.entries(RESOURCE_KINDS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        {idLocal === OUTRO_LOCAL ? (
          <Input
            label="Nome do local"
            required
            value={outroNome}
            onChange={(e) => setOutroNome(e.target.value)}
          />
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

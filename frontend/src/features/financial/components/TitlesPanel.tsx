import { useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import {
  formatCentsToBRL,
  formatDate,
  formatDateOnly,
  parseBRLToCents,
} from '../../../shared/utils/format';
import { listResourceAccounts } from '../api/cash-api';
import {
  cancelFinancialTitle,
  createFinancialTitle,
  listFinancialTitles,
  settleFinancialTitle,
} from '../api/title-api';
import type { ResourceAccount } from '../types/cash';
import { locaisAtivos } from '../types/cash';
import {
  PAYMENT_METHODS,
  type PaymentMethod,
  type TransactionType,
} from '../types/financial';
import type { FinancialTitle } from '../types/title';
export function TitlesPanel({
  type,
  onChanged,
}: {
  type: TransactionType;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<FinancialTitle[]>([]);
  const [accounts, setAccounts] = useState<ResourceAccount[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<FinancialTitle | null>(null);
  const [description, setDescription] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [value, setValue] = useState('');
  const [date, setDate] = useState(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife' }).format(
      new Date(),
    ),
  );
  const [resource, setResource] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('PIX');
  const [reason, setReason] = useState('');
  const [key, setKey] = useState(() => crypto.randomUUID());
  const label = type === 'RECEITA' ? 'Receber' : 'Pagar';
  async function reload() {
    const [result, a] = await Promise.all([
      listFinancialTitles(type, page),
      listResourceAccounts(),
    ]);
    setItems(result.items);
    setTotal(result.total);
    setAccounts(a);
  }
  useEffect(() => {
    let live = true;
    Promise.all([listFinancialTitles(type, page), listResourceAccounts()])
      .then(([r, a]) => {
        if (live) {
          setItems(r.items);
          setTotal(r.total);
          setAccounts(a);
        }
      })
      .catch((e) => {
        if (live) setError(describeApiError(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [type, page]);
  async function act(work: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await work();
      await reload();
      setSelected(null);
      setCreating(false);
      onChanged();
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      <Button
        onClick={() => {
          setCreating(true);
          setValue('');
          setDescription('');
          setCounterparty('');
          setError(null);
        }}
      >
        Nova conta a {label.toLowerCase()}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
      {loading ? (
        <p>Carregando contas…</p>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            title="Nenhuma conta"
            description="Cadastre uma conta com valor e vencimento."
          />
        </Card>
      ) : (
        items.map((item) => (
          <Card key={item.id}>
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="font-semibold">{item.description}</h3>
                <p className="text-sm text-slate-500">
                  {item.counterparty} · Vence {formatDateOnly(item.dueDate)} ·{' '}
                  {item.status === 'PARCIAL'
                    ? 'Parcial'
                    : item.status === 'PAGO'
                      ? 'Quitado'
                      : item.status === 'CANCELADO'
                        ? 'Cancelado'
                        : 'Pendente'}
                  {item.overdue ? ' · Em atraso' : ''}
                </p>
              </div>
              <div className="text-sm">
                <p>Total: {formatCentsToBRL(item.amountCents)}</p>
                <p>Baixado: {formatCentsToBRL(item.paidCents)}</p>
                <strong>
                  Em aberto: {formatCentsToBRL(item.remainingCents)}
                </strong>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setSelected(item);
                  setValue('');
                  setReason('');
                  setKey(crypto.randomUUID());
                  setError(null);
                }}
              >
                Detalhar
              </Button>
            </div>
          </Card>
        ))
      )}
      <div className="flex items-center justify-between">
        <Button
          variant="secondary"
          disabled={page === 1 || loading}
          onClick={() => {
            setLoading(true);
            setPage(page - 1);
          }}
        >
          Anterior
        </Button>
        <span className="text-sm">
          Página {page} · {total} contas
        </span>
        <Button
          variant="secondary"
          disabled={page * 20 >= total || loading}
          onClick={() => {
            setLoading(true);
            setPage(page + 1);
          }}
        >
          Próxima
        </Button>
      </div>
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title={`Nova conta a ${label.toLowerCase()}`}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void act(() =>
              createFinancialTitle({
                type,
                description,
                counterparty: counterparty || undefined,
                dueDate: date,
                amountCents: parseBRLToCents(value),
              }),
            );
          }}
        >
          <Input
            label="Descrição"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Input
            label={
              type === 'RECEITA'
                ? 'Cliente / responsável'
                : 'Fornecedor / favorecido'
            }
            value={counterparty}
            onChange={(e) => setCounterparty(e.target.value)}
          />
          <Input
            label="Vencimento"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <Input
            label="Valor (R$)"
            required
            inputMode="decimal"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {error && <p className="text-sm text-rose-700">{error}</p>}
          <Button type="submit" disabled={busy}>
            Salvar conta
          </Button>
        </form>
      </Modal>
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.description || 'Conta'}
      >
        {selected && (
          <div className="space-y-4">
            <p>
              Em aberto:{' '}
              <strong>{formatCentsToBRL(selected.remainingCents)}</strong>
            </p>
            <h3 className="font-semibold">Histórico de baixas</h3>
            {selected.settlements.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma baixa registrada.
              </p>
            ) : (
              selected.settlements.map((s) => (
                <p className="text-sm" key={s.id}>
                  {formatDate(s.date)} · {formatCentsToBRL(s.amountCents)} ·{' '}
                  {accounts.find((a) => a.id === s.resourceAccountId)?.name ||
                    'Local'}{' '}
                  · {PAYMENT_METHODS[s.paymentMethod]}
                </p>
              ))
            )}
            {selected.remainingCents > 0 && selected.status !== 'CANCELADO' && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(() =>
                    settleFinancialTitle(selected.id, {
                      amountCents: parseBRLToCents(value),
                      date,
                      resourceAccountId: resource,
                      paymentMethod: method,
                      idempotencyKey: key,
                    }),
                  );
                }}
              >
                <Input
                  label="Valor da baixa (R$)"
                  required
                  inputMode="decimal"
                  value={value}
                  onChange={(e) => {
                    setValue(e.target.value);
                    setKey(crypto.randomUUID());
                  }}
                />
                <Input
                  label="Data da baixa"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => {
                    setDate(e.target.value);
                    setKey(crypto.randomUUID());
                  }}
                />
                <Select
                  label="Local do recurso"
                  required
                  value={resource}
                  onChange={(e) => {
                    setResource(e.target.value);
                    setKey(crypto.randomUUID());
                  }}
                  options={[
                    { value: '', label: 'Selecione' },
                    ...locaisAtivos(accounts).map((a) => ({ value: a.id, label: a.name })),
                  ]}
                />
                <Select
                  label="Forma de pagamento"
                  value={method}
                  onChange={(e) => {
                    setMethod(e.target.value as PaymentMethod);
                    setKey(crypto.randomUUID());
                  }}
                  options={Object.entries(PAYMENT_METHODS).map(
                    ([value, label]) => ({ value, label }),
                  )}
                />
                <Button type="submit" disabled={busy}>
                  {label}
                </Button>
              </form>
            )}
            {selected.status === 'PENDENTE' && (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(() => cancelFinancialTitle(selected.id, reason));
                }}
              >
                <Input
                  label="Motivo do cancelamento"
                  value={reason}
                  required
                  onChange={(e) => setReason(e.target.value)}
                />
                <Button type="submit" variant="danger" disabled={busy}>
                  Cancelar conta
                </Button>
              </form>
            )}
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

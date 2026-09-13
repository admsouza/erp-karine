import { useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import { parseBRLToCents, todayISO } from '../../../shared/utils/format';
import { listResourceAccounts } from '../api/cash-api';
import {
  assignFinancialResource,
  createFinancialAdjustment,
} from '../api/financial-api';
import type { ResourceAccount } from '../types/cash';
import { locaisAtivos } from '../types/cash';
import {
  TRANSACTION_TYPES,
  PAYMENT_METHODS,
  type FinancialTransaction,
  type TransactionType,
  type PaymentMethod,
} from '../types/financial';
export function TransactionResourceModal({
  item,
  onClose,
  onSaved,
}: {
  item: FinancialTransaction;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [accounts, setAccounts] = useState<ResourceAccount[]>([]);
  const [mode, setMode] = useState('resource');
  const [account, setAccount] = useState(item.resourceAccountId || '');
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState(`Ajuste: ${item.description}`);
  const [value, setValue] = useState('');
  const [type, setType] = useState<TransactionType>('DESPESA');
  const [method, setMethod] = useState<PaymentMethod>(item.paymentMethod);
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    listResourceAccounts()
      .then(setAccounts)
      .catch((e) => setError(describeApiError(e)));
  }, []);
  return (
    <Modal open onClose={onClose} title="Local e ajuste do lançamento">
      <form
        className="space-y-3"
        onChange={() => setKey(crypto.randomUUID())}
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            if (mode === 'resource')
              await assignFinancialResource(item.id, account, reason);
            else
              await createFinancialAdjustment(item.id, {
                description,
                type,
                amountCents: parseBRLToCents(value),
                date,
                resourceAccountId: account,
                paymentMethod: method,
                reason,
                idempotencyKey: key,
              });
            onSaved();
            onClose();
          } catch (x) {
            setError(describeApiError(x));
          } finally {
            setBusy(false);
          }
        }}
      >
        <p className="text-sm text-slate-500">{item.description}</p>
        <Select
          label="Ação"
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          options={[
            { value: 'resource', label: 'Definir local do recurso' },
            { value: 'adjustment', label: 'Registrar ajuste em caixa aberto' },
          ]}
        />
        <Select
          label="Local do recurso"
          required
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          options={[
            { value: '', label: 'Selecione' },
            ...locaisAtivos(accounts).map((a) => ({ value: a.id, label: a.name })),
          ]}
        />
        {mode === 'adjustment' && (
          <>
            <p className="text-sm text-slate-500">
              Um novo movimento será vinculado ao original. Escolha receita para
              acrescentar recurso ou despesa para reduzir.
            </p>
            <Input
              label="Descrição do ajuste"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <Select
              label="Tipo do ajuste"
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              options={Object.entries(TRANSACTION_TYPES).map(
                ([value, label]) => ({ value, label }),
              )}
            />
            <Input
              label="Valor do ajuste (R$)"
              required
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            <Input
              label="Data do ajuste"
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Select
              label="Forma de pagamento"
              value={method}
              onChange={(e) => setMethod(e.target.value as PaymentMethod)}
              options={Object.entries(PAYMENT_METHODS).map(
                ([value, label]) => ({ value, label }),
              )}
            />
          </>
        )}
        <Input
          label="Motivo"
          required
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-rose-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy}>
          Salvar
        </Button>
      </form>
    </Modal>
  );
}

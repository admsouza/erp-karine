import { useEffect, useState, type FormEvent } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Modal } from '../../../shared/components/Modal';
import { Select } from '../../../shared/components/Select';
import { formatCentsToBRL, parseBRLToCents } from '../../../shared/utils/format';
import { listResourceAccounts } from '../api/cash-api';
import {
  createManualTransaction,
  financialOptions,
  listCounterparties,
  type FinancialOption,
} from '../api/financial-api';
import { listProductOptions } from '../../products/api/products-api';
import type { Product } from '../../products/types/product';
import type { ResourceAccount } from '../types/cash';
import {
  PAYMENT_METHODS,
  TRANSACTION_TYPES,
  type PaymentMethod,
  type TransactionType,
} from '../types/financial';

const SEM_DESCONTO = '';
const DESCONTO_TIPOS = [
  { value: SEM_DESCONTO, label: 'Sem desconto' },
  { value: 'PERCENT', label: 'Percentual (%)' },
  { value: 'AMOUNT', label: 'Em reais (R$)' },
];

/**
 * Lançamento manual (venda avulsa ou despesa).
 *
 * Papéis assimétricos: **receita** pergunta o **cliente** (vincula à ficha dele) e **despesa**
 * pergunta o **credor** (texto, com sugestão dos já usados). O **procedimento** vinculado preenche
 * o valor vigente, que continua editável — a venda pode ter pacote ou ajuste.
 *
 * O desconto é informado por tipo (% ou R$) e o **total mostrado é o líquido** — o que de fato
 * entra/sai. Ao salvar, o sistema **pergunta se já foi recebido/pago**, em vez de ter um campo de
 * situação no formulário.
 */
export function ManualTransactionModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [accounts, setAccounts] = useState<ResourceAccount[]>([]);
  const [clients, setClients] = useState<FinancialOption[]>([]);
  const [procedures, setProcedures] = useState<FinancialOption[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [credores, setCredores] = useState<string[]>([]);
  const [type, setType] = useState<TransactionType>('RECEITA');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [procedureId, setProcedureId] = useState('');
  const [productId, setProductId] = useState('');
  const [resourceAccountId, setResourceAccountId] = useState('');
  const [value, setValue] = useState('');
  const [discountType, setDiscountType] = useState(SEM_DESCONTO);
  const [discountValue, setDiscountValue] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [confirmando, setConfirmando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    listResourceAccounts()
      .then((todos) => setAccounts(todos.filter((x) => x.active)))
      .catch((falha) => setError(describeApiError(falha)));
    financialOptions()
      .then((opcoes) => {
        setClients(opcoes.clients);
        setProcedures(opcoes.procedures);
      })
      .catch((falha) => setError(describeApiError(falha)));
    listProductOptions()
      .then(setProducts)
      .catch(() => setProducts([]));
    listCounterparties()
      .then(setCredores)
      .catch(() => setCredores([]));
  }, [open]);

  const receita = type === 'RECEITA';
  const brutoCents = value ? parseBRLToCents(value) : 0;
  const informadoCents = discountValue ? parseBRLToCents(discountValue) : 0;
  const percentualValido = discountType !== 'PERCENT' || informadoCents <= 10000;
  const descontoCents =
    discountType === 'PERCENT'
      ? Math.round((brutoCents * informadoCents) / 10000)
      : discountType === 'AMOUNT'
        ? informadoCents
        : 0;
  const liquidoCents = Math.max(brutoCents - descontoCents, 0);

  async function salvar(status: 'PAGO' | 'PENDENTE') {
    setSaving(true);
    setError(null);
    try {
      await createManualTransaction({
        description,
        type,
        clientId: receita && clientId ? clientId : undefined,
        counterparty: !receita && counterparty ? counterparty : undefined,
        procedureId: procedureId || undefined,
        productId: productId || undefined,
        resourceAccountId: resourceAccountId || undefined,
        amountCents: liquidoCents,
        grossAmountCents: discountType ? brutoCents : undefined,
        discountType: discountType
          ? (discountType as 'PERCENT' | 'AMOUNT')
          : undefined,
        discountValue: discountType ? informadoCents : undefined,
        date,
        paymentMethod,
        status,
      });
      onSaved();
      onClose();
    } catch (falha) {
      setError(describeApiError(falha));
      setConfirmando(false);
    } finally {
      setSaving(false);
    }
  }

  function submit(evento: FormEvent) {
    evento.preventDefault();
    setError(null);
    if (!value || brutoCents <= 0) {
      setError('Informe o valor da venda.');
      return;
    }
    if (!percentualValido) {
      setError('O desconto percentual não pode passar de 100%.');
      return;
    }
    if (descontoCents > brutoCents) {
      setError('O desconto não pode ser maior que o valor.');
      return;
    }
    setConfirmando(true);
  }

  function escolherProduto(id: string) {
    setProductId(id);
    setProcedureId('');
    const escolhido = products.find((x) => x.id === id);
    if (!escolhido) return;
    if (!description) setDescription(escolhido.name);
    if (!value && escolhido.priceCents) {
      setValue(formatCentsToBRL(escolhido.priceCents));
    }
  }

  function escolherProcedimento(id: string) {
    setProcedureId(id);
    setProductId('');
    const escolhido = procedures.find((x) => x.id === id);
    if (!escolhido) return;
    if (!description) setDescription(escolhido.name);
    if (!value && escolhido.currentValueCents) {
      setValue(formatCentsToBRL(escolhido.currentValueCents));
    }
  }

  return (
    <>
      <Modal open={open} title="Novo lançamento" onClose={onClose}>
        <form className="space-y-4" onSubmit={submit}>
          <Input
            label="Descrição"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Tipo"
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              options={Object.entries(TRANSACTION_TYPES).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Input
              label="Valor (R$)"
              required
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
            {receita ? (
              <Select
                label="Cliente"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                options={[
                  { value: '', label: 'Sem cliente' },
                  ...clients.map((item) => ({ value: item.id, label: item.name })),
                ]}
              />
            ) : (
              <>
                <Input
                  label="Credor"
                  hint="Quem recebeu — sugere os credores já usados"
                  list="credores-financeiro"
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                />
                <datalist id="credores-financeiro">
                  {credores.map((item) => (
                    <option key={item} value={item} />
                  ))}
                </datalist>
              </>
            )}
            <Select
              label="Procedimento"
              value={procedureId}
              onChange={(e) => escolherProcedimento(e.target.value)}
              options={[
                { value: '', label: 'Sem procedimento' },
                ...procedures.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <Select
              label="Produto"
              value={productId}
              onChange={(e) => escolherProduto(e.target.value)}
              options={[
                { value: '', label: 'Sem produto' },
                ...products.map((item) => ({ value: item.id, label: item.name })),
              ]}
            />
            <Input
              label="Data"
              required
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Select
              label="Forma de pagamento"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              options={Object.entries(PAYMENT_METHODS).map(([value, label]) => ({
                value,
                label,
              }))}
            />
            <Select
              label="Local do recurso"
              value={resourceAccountId}
              onChange={(e) => setResourceAccountId(e.target.value)}
              options={[
                { value: '', label: 'A definir' },
                ...accounts.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
            <Select
              label="Desconto"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value)}
              options={DESCONTO_TIPOS}
            />
            {discountType ? (
              <Input
                label={
                  discountType === 'PERCENT' ? 'Desconto (%)' : 'Desconto (R$)'
                }
                inputMode="decimal"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
              />
            ) : null}
          </div>
          <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
            <p className="flex justify-between">
              <span>Valor</span>
              <span>{formatCentsToBRL(brutoCents)}</span>
            </p>
            {discountType ? (
              <p className="flex justify-between text-slate-600">
                <span>Desconto</span>
                <span>- {formatCentsToBRL(descontoCents)}</span>
              </p>
            ) : null}
            <p className="mt-1 flex justify-between font-semibold text-slate-900">
              <span>{receita ? 'Total a receber' : 'Total a pagar'}</span>
              <span>{formatCentsToBRL(liquidoCents)}</span>
            </p>
          </div>
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
              {saving ? 'Salvando…' : 'Salvar lançamento'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={confirmando}
        title={receita ? 'Já foi recebido?' : 'Já foi pago?'}
        onClose={() => setConfirmando(false)}
      >
        <p className="text-sm text-slate-600">
          {receita
            ? 'Esse valor já entrou no caixa? Se não, o lançamento fica pendente até o recebimento.'
            : 'Esse valor já saiu do caixa? Se não, o lançamento fica pendente até o pagamento.'}
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            variant="secondary"
            disabled={saving}
            onClick={() => void salvar('PENDENTE')}
          >
            Não, ficou pendente
          </Button>
          <Button disabled={saving} onClick={() => void salvar('PAGO')}>
            {saving ? 'Salvando…' : receita ? 'Sim, já recebi' : 'Sim, já paguei'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

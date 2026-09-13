import { useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import {
  formatCentsToBRL,
  parseBRLToCents,
  formatDateTimeRecife,
} from '../../../shared/utils/format';
import {
  createReconciliation,
  getCashPeriod,
  listCashPeriods,
  listReconciliations,
} from '../api/cash-api';
import type { CashPeriod, FinancialReconciliation } from '../types/cash';
export function ReconciliationPanel() {
  const [periods, setPeriods] = useState<CashPeriod[]>([]);
  const [period, setPeriod] = useState<CashPeriod | null>(null);
  const [items, setItems] = useState<FinancialReconciliation[]>([]);
  const [accountId, setAccountId] = useState('');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    listCashPeriods()
      .then(setPeriods)
      .catch((e) => setError(describeApiError(e)))
      .finally(() => setLoading(false));
  }, []);
  async function choose(id: string) {
    setLoading(true);
    setError(null);
    try {
      const [p, r] = await Promise.all([
        getCashPeriod(id),
        listReconciliations(id),
      ]);
      setPeriod(p);
      setItems(r);
      setAccountId('');
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="space-y-4">
      <Card title="Conciliação">
        <p className="mb-3 text-sm text-slate-500">
          Compare o saldo dos registros com o total efetivo do local no período.
          A divergência fica registrada; nenhum lançamento é alterado.
        </p>
        <Select
          label="Período da conciliação"
          value={period?.id || ''}
          disabled={loading}
          onChange={(e) => void choose(e.target.value)}
          options={[
            { value: '', label: 'Selecione' },
            ...periods.map((p) => ({ value: p.id, label: p.month })),
          ]}
        />
        {loading && <p>Carregando conciliação…</p>}
        {period && (
          <form
            className="mt-4 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                await createReconciliation({
                  periodId: period.id,
                  accountId,
                  amountCents: parseBRLToCents(value),
                  reason,
                });
                setItems(await listReconciliations(period.id));
                setValue('');
                setReason('');
              } catch (x) {
                setError(describeApiError(x));
              } finally {
                setBusy(false);
              }
            }}
          >
            <Select
              label="Local conferido"
              required
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              options={[
                { value: '', label: 'Selecione' },
                ...period.balances.map((b) => ({
                  value: b.accountId,
                  label: b.account.name,
                })),
              ]}
            />
            {accountId && (
              <p>
                Saldo esperado:{' '}
                <strong>
                  {formatCentsToBRL(
                    period.balances.find((b) => b.accountId === accountId)
                      ?.expectedCents,
                  )}
                </strong>
              </p>
            )}
            <Input
              label="Saldo efetivo (R$)"
              required
              value={value}
              inputMode="decimal"
              onChange={(e) => setValue(e.target.value)}
            />
            <Input
              label="Motivo / referência da conferência"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button type="submit" disabled={busy}>
              Registrar conciliação
            </Button>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-700">
            {error}
          </p>
        )}
      </Card>
      {items.map((r) => (
        <Card key={r.id}>
          <h3 className="font-semibold">
            {
              period?.balances.find((b) => b.accountId === r.accountId)?.account
                .name
            }
          </h3>
          <p className="text-sm">
            {formatDateTimeRecife(r.createdAt)} · {r.reason}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <p>Esperado: {formatCentsToBRL(r.expectedCents)}</p>
            <p>Efetivo: {formatCentsToBRL(r.countedCents)}</p>
            <p>
              Divergência:{' '}
              <strong>{formatCentsToBRL(r.differenceCents)}</strong>
            </p>
          </div>
        </Card>
      ))}
    </div>
  );
}

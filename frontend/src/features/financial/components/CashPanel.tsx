import { useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Card } from '../../../shared/components/Card';
import { Button } from '../../../shared/components/Button';
import { Input } from '../../../shared/components/Input';
import { Select } from '../../../shared/components/Select';
import {
  formatCentsToBRL,
  parseBRLToCents,
} from '../../../shared/utils/format';
import {
  closeCashPeriod,
  createResourceAccount,
  getCashPeriod,
  listCashPeriods,
  listResourceAccounts,
  openCashPeriod,
} from '../api/cash-api';
import {
  RESOURCE_KINDS,
  type CashPeriod,
  type ResourceAccount,
} from '../types/cash';
export function CashPanel() {
  const [accounts, setAccounts] = useState<ResourceAccount[]>([]);
  const [periods, setPeriods] = useState<CashPeriod[]>([]);
  const [detail, setDetail] = useState<CashPeriod | null>(null);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [name, setName] = useState('');
  const [kind, setKind] = useState('CASH');
  const [month, setMonth] = useState(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Recife' })
      .format(new Date())
      .slice(0, 7),
  );
  const [initial, setInitial] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function reload() {
    const [a, p] = await Promise.all([
      listResourceAccounts(),
      listCashPeriods(),
    ]);
    setAccounts(a);
    setPeriods(p);
    if (p[0]) setDetail(await getCashPeriod(p[0].id));
  }
  useEffect(() => {
    let live = true;
    Promise.all([listResourceAccounts(), listCashPeriods()])
      .then(async ([a, p]) => {
        const d = p[0] ? await getCashPeriod(p[0].id) : null;
        if (live) {
          setAccounts(a);
          setPeriods(p);
          setDetail(d);
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
  }, []);
  async function act(work: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await work();
      await reload();
    } catch (e) {
      setError(describeApiError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      )}
      {loading ? (
        <p>Carregando caixa…</p>
      ) : (
        <>
          <Card title="Locais do recurso">
            <form
              className="grid gap-3 sm:grid-cols-3"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  await createResourceAccount({ name, kind });
                  setName('');
                });
              }}
            >
              <Input
                label="Nome do local"
                value={name}
                required
                onChange={(e) => setName(e.target.value)}
              />
              <Select
                label="Tipo de local"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                options={Object.entries(RESOURCE_KINDS).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
              <Button disabled={busy} type="submit">
                Adicionar local
              </Button>
            </form>
            <ul className="mt-3 space-y-1 text-sm">
              {accounts.map((a) => (
                <li key={a.id}>
                  {a.name} · {RESOURCE_KINDS[a.kind]}
                </li>
              ))}
            </ul>
          </Card>
          <Card title="Abertura mensal">
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void act(() =>
                  openCashPeriod({
                    month,
                    ...(!periods.length
                      ? {
                          initialBalances: accounts.map((a) => ({
                            accountId: a.id,
                            amountCents: parseBRLToCents(initial[a.id] || '0'),
                          })),
                        }
                      : {}),
                  }),
                );
              }}
            >
              <Input
                label="Mês do caixa"
                type="month"
                required
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
              {periods.length === 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {accounts.map((a) => (
                    <Input
                      key={a.id}
                      label={`Saldo inicial — ${a.name} (R$)`}
                      value={initial[a.id] || ''}
                      inputMode="decimal"
                      onChange={(e) =>
                        setInitial({ ...initial, [a.id]: e.target.value })
                      }
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  O saldo apurado do último fechamento será transportado por
                  local.
                </p>
              )}
              <Button disabled={busy || accounts.length === 0} type="submit">
                Abrir caixa
              </Button>
            </form>
          </Card>
          <Card title="Caixa">
            <Select
              label="Período"
              value={detail?.id || ''}
              onChange={(e) => {
                setError(null);
                void getCashPeriod(e.target.value)
                  .then(setDetail)
                  .catch((x) => setError(describeApiError(x)));
              }}
              options={[
                { value: '', label: 'Selecione' },
                ...periods.map((p) => ({
                  value: p.id,
                  label: `${p.month} · ${p.closedAt ? 'Fechado' : 'Aberto'}`,
                })),
              ]}
            />
            {detail && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {detail.balances.map((b) => (
                  <article
                    key={b.accountId}
                    className="rounded-lg border border-slate-200 p-3"
                  >
                    <h3 className="font-semibold">{b.account.name}</h3>
                    {[
                      ['Saldo inicial', b.openingCents],
                      ['Entradas', b.incomingCents],
                      ['Saídas', b.outgoingCents],
                      ['Saldo esperado', b.expectedCents],
                      ['Saldo apurado', b.countedCents],
                      ['Divergência', b.differenceCents],
                    ].map(([label, value]) => (
                      <p
                        key={String(label)}
                        className="flex justify-between gap-2 text-sm"
                      >
                        <span>{label}</span>
                        <strong>
                          {value === null
                            ? '—'
                            : formatCentsToBRL(Number(value))}
                        </strong>
                      </p>
                    ))}
                  </article>
                ))}
              </div>
            )}
            {detail && !detail.closedAt && (
              <form
                className="mt-4 space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void act(() =>
                    closeCashPeriod(detail.id, {
                      balances: detail.balances.map((b) => ({
                        accountId: b.accountId,
                        amountCents: parseBRLToCents(
                          counted[b.accountId] || '0',
                        ),
                      })),
                      reason,
                    }),
                  );
                }}
              >
                {!!detail.unassignedCount && (
                  <p className="text-sm text-amber-700">
                    {detail.unassignedCount} lançamento(s) sem local: defina o
                    destino na lista antes do fechamento.
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.balances.map((b) => (
                    <Input
                      key={b.accountId}
                      label={`Saldo apurado — ${b.account.name} (R$)`}
                      required
                      inputMode="decimal"
                      value={counted[b.accountId] ?? ''}
                      onChange={(e) =>
                        setCounted({
                          ...counted,
                          [b.accountId]: e.target.value,
                        })
                      }
                    />
                  ))}
                </div>
                <Input
                  label="Motivo do fechamento"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
                <p className="text-sm text-slate-500">
                  O fechamento bloqueia alterações nos lançamentos do mês e
                  preserva as divergências.
                </p>
                <Button
                  type="submit"
                  disabled={busy || !!detail.unassignedCount}
                >
                  Fechar caixa
                </Button>
              </form>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

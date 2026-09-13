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
  inactivateResourceAccount,
  listCashPeriods,
  listResourceAccounts,
  openCashPeriod,
  reactivateResourceAccount,
} from '../api/cash-api';
import { EditResourceAccountModal } from './EditResourceAccountModal';
import {
  IDENTIFICACOES_LOCAL,
  OUTRO_LOCAL,
  RESOURCE_KINDS,
  locaisAtivos,
  type CashPeriod,
  type ResourceAccount,
} from '../types/cash';
export function CashPanel() {
  const [accounts, setAccounts] = useState<ResourceAccount[]>([]);
  const [periods, setPeriods] = useState<CashPeriod[]>([]);
  const [detail, setDetail] = useState<CashPeriod | null>(null);
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [editando, setEditando] = useState<ResourceAccount | null>(null);
  const [idLocal, setIdLocal] = useState('');
  const [customName, setCustomName] = useState('');
  const [kind, setKind] = useState('CASH');
  // Nome que vai para o cadastro: sugestão escolhida (o valor carrega o tipo junto) ou o nome digitado.
  const selectedName =
    idLocal === OUTRO_LOCAL
      ? customName.trim()
      : (IDENTIFICACOES_LOCAL.find((x) => `${x.kind}:${x.name}` === idLocal)
          ?.name ?? '');
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
      {editando && (
        <EditResourceAccountModal
          key={editando.id}
          account={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            void act(reload);
          }}
        />
      )}
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
                  await createResourceAccount({
                    name: selectedName,
                    kind,
                  });
                  setIdLocal('');
                  setCustomName('');
                });
              }}
            >
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
                  { value: '', label: 'Selecione…' },
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
                onChange={(e) => {
                  setKind(e.target.value);
                  setIdLocal('');
                  setCustomName('');
                }}
                options={Object.entries(RESOURCE_KINDS).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
              <Button disabled={busy || !selectedName} type="submit">
                Adicionar local
              </Button>
              {idLocal === OUTRO_LOCAL ? (
                <Input
                  label="Nome do local"
                  value={customName}
                  required
                  className="sm:col-span-3"
                  hint="Ex.: Banco Itaú — conta da clínica, Maquineta Cielo"
                  onChange={(e) => setCustomName(e.target.value)}
                />
              ) : (
                <p className="text-xs text-slate-400 sm:col-span-3">
                  Espécie: dinheiro na gaveta · Banco: cada conta usada ·
                  Maquineta: cada máquina/adquirente. Depois de cadastrar, o
                  local é só selecionado nos lançamentos, nas baixas e na
                  conciliação.
                </p>
              )}
            </form>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {locaisAtivos(accounts).map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <span>
                    {a.name} · {RESOURCE_KINDS[a.kind]}
                  </span>
                  <span className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => setEditando(a)}
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() => void act(() => inactivateResourceAccount(a.id))}
                    >
                      Inativar
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
            {accounts.some((a) => !a.active) && (
              <>
                <h3 className="mt-4 text-xs font-semibold uppercase text-slate-400">
                  Inativos
                </h3>
                <ul className="mt-1 divide-y divide-slate-100 text-sm">
                  {accounts
                    .filter((a) => !a.active)
                    .map((a) => (
                      <li
                        key={a.id}
                        className="flex flex-wrap items-center justify-between gap-2 py-2 text-slate-500"
                      >
                        <span>
                          {a.name} · {RESOURCE_KINDS[a.kind]}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void act(() => reactivateResourceAccount(a.id))
                          }
                        >
                          Reativar
                        </Button>
                      </li>
                    ))}
                </ul>
                <p className="mt-2 text-xs text-slate-400">
                  Inativo sai das listas de novos lançamentos e de novas
                  aberturas; os meses já fechados continuam com a composição.
                </p>
              </>
            )}
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
                          initialBalances: locaisAtivos(accounts).map((a) => ({
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
                  {locaisAtivos(accounts).map((a) => (
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
              <Button
                disabled={busy || locaisAtivos(accounts).length === 0}
                type="submit"
              >
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
              <>
                {/* O saldo do caixa é um só: o total é a soma dos locais. */}
                <div className="mt-4 rounded-lg border border-slate-300 bg-slate-50 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="font-semibold">Saldo total</h3>
                    <strong className="text-lg">
                      {formatCentsToBRL(
                        (detail.totals.countedCents ??
                          detail.totals.expectedCents) || 0,
                      )}
                    </strong>
                  </div>
                  <p className="text-xs text-slate-500">
                    {detail.totals.countedCents !== null
                      ? 'Apurado na conferência'
                      : 'Esperado pelo sistema (ainda não conferido)'}{' '}
                    · composição: soma de {detail.balances.length}{' '}
                    {detail.balances.length === 1 ? 'local' : 'locais'}
                  </p>
                  <div className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                    {[
                      ['Saldo inicial', detail.totals.openingCents],
                      ['Entradas', detail.totals.incomingCents],
                      ['Saídas', detail.totals.outgoingCents],
                      ['Saldo esperado', detail.totals.expectedCents],
                      ['Saldo apurado', detail.totals.countedCents],
                      ['Divergência', detail.totals.differenceCents],
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
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-semibold text-slate-600">
                  Composição por local do recurso
                </h3>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
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
              </>
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

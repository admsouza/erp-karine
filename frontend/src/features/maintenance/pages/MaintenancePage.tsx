import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { describeApiError } from '../../../shared/api/http-client';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Pagination } from '../../../shared/components/Pagination';
import { Select } from '../../../shared/components/Select';
import { formatDateTimeRecife } from '../../../shared/utils/format';
import {
  getMaintenanceSummary,
  inactivateMaintenanceItem,
  listMaintenance,
  reactivateMaintenanceItem,
} from '../api/maintenance-api';
import { MaintenanceEditModal } from '../components/MaintenanceEditModal';
import {
  MAINTENANCE_HOME,
  MAINTENANCE_TYPES,
  MAINTENANCE_TYPE_ORDER,
  type MaintenanceItem,
  type MaintenanceType,
} from '../types/maintenance';

const TAMANHO_PAGINA = 20;

/**
 * Manutenção de cadastros (Sistema): um lugar só para **corrigir** e
 * **inativar/reativar** os cadastros básicos, sem caçar a tela de cada módulo.
 * O hub não cria nada e não tem regra própria: quem valida é o módulo dono.
 */
export function MaintenancePage() {
  const [type, setType] = useState<MaintenanceType>('RESOURCE_ACCOUNT');
  const [search, setSearch] = useState('');
  const [busca, setBusca] = useState('');
  const [active, setActive] = useState<'true' | 'false' | ''>('');
  const [page, setPage] = useState(1);
  /**
   * `token` sobe a cada ação do usuário (filtro, tipo, página) e é o que dispara a busca.
   * `carregadoToken` marca qual delas já voltou — assim `loading` é **derivado** e nunca fica
   * preso em "Carregando…" quando a ação não muda nenhum filtro (ex.: refiltrar o mesmo valor).
   */
  const [token, setToken] = useState(0);
  const [carregadoToken, setCarregadoToken] = useState(-1);
  const [itens, setItens] = useState<MaintenanceItem[]>([]);
  const [total, setTotal] = useState(0);
  const loading = carregadoToken !== token;
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<MaintenanceItem | null>(null);
  const [recarregar, setRecarregar] = useState(0);
  const [contagens, setContagens] = useState<Record<string, number>>({});

  useEffect(() => {
    getMaintenanceSummary()
      .then((resumo) => setContagens(resumo.counts))
      .catch(() => setContagens({}));
  }, [recarregar]);

  const buscar = () => setToken((atual) => atual + 1);
  /** Recarrega lista **e** contagens — usado depois de editar/inativar/reativar. */
  const recarregarTudo = () => {
    setRecarregar((atual) => atual + 1);
    buscar();
  };

  useEffect(() => {
    const controller = new AbortController();
    listMaintenance(
      {
        type,
        search: busca || undefined,
        active: active === '' ? undefined : active,
        page,
        pageSize: TAMANHO_PAGINA,
      },
      controller.signal,
    )
      .then((resposta) => {
        if (controller.signal.aborted) return;
        setItens(resposta.items);
        setTotal(resposta.total);
      })
      .catch((falha) => {
        if (!controller.signal.aborted) setError(describeApiError(falha));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregadoToken(token);
      });
    return () => controller.abort();
  }, [type, busca, active, page, token]);

  async function executar(
    item: MaintenanceItem,
    trabalho: () => Promise<unknown>,
  ) {
    setBusy(item.id);
    setError(null);
    try {
      await trabalho();
      recarregarTudo();
    } catch (falha) {
      setError(describeApiError(falha));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Manutenção de cadastros"
        description="Corrigir a identificação e tirar de circulação (ou devolver) cadastros básicos. Nada aqui apaga histórico: inativar preserva o que já foi registrado."
      />

      <Card>
        <form
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          onSubmit={(evento) => {
            evento.preventDefault();
            setPage(1);
            setBusca(search.trim());
            buscar();
          }}
        >
          <Select
            label="Cadastro"
            value={type}
            onChange={(e) => {
              setType(e.target.value as MaintenanceType);
              setPage(1);
              buscar();
            }}
            options={MAINTENANCE_TYPE_ORDER.map((valor) => ({
              value: valor,
              label:
                contagens[valor] === undefined
                  ? MAINTENANCE_TYPES[valor]
                  : `${MAINTENANCE_TYPES[valor]} (${contagens[valor]})`,
            }))}
          />
          <Input
            label="Busca"
            hint="Pela identificação (nome)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            label="Situação"
            value={active}
            onChange={(e) => {
              setActive(e.target.value as 'true' | 'false' | '');
              setPage(1);
              buscar();
            }}
            options={[
              { value: '', label: 'Ativos e inativos' },
              { value: 'true', label: 'Somente ativos' },
              { value: 'false', label: 'Somente inativos' },
            ]}
          />
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Filtrar
            </Button>
          </div>
        </form>
      </Card>

      {error ? (
        <p role="alert" className="text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      <Card>
        {loading ? (
          <p className="text-sm text-slate-500">Carregando cadastros…</p>
        ) : itens.length === 0 ? (
          <EmptyState
            title={
              busca || active
                ? 'Nenhum cadastro encontrado com esse filtro'
                : `Nenhum cadastro em ${MAINTENANCE_TYPES[type].toLowerCase()}`
            }
            description={
              busca || active
                ? 'Limpe a busca e a situação para ver todos.'
                : 'A manutenção não cria registros — o cadastro é feito na tela do módulo. Depois de cadastrar, ele aparece aqui para correção e inativação.'
            }
          >
            {busca || active ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setBusca('');
                  setActive('');
                  setPage(1);
                  buscar();
                }}
              >
                Limpar filtros
              </Button>
            ) : (
              <Link
                to={MAINTENANCE_HOME[type]}
                className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                Cadastrar em {MAINTENANCE_TYPES[type]}
              </Link>
            )}
          </EmptyState>
        ) : (
          <ul className="divide-y divide-slate-100">
            {itens.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500">
                    {item.secondary}
                    {item.updatedAt
                      ? ` · atualizado em ${formatDateTimeRecife(item.updatedAt)}`
                      : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={item.active ? 'success' : 'neutral'}>
                    {item.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditando(item)}
                  >
                    Editar
                  </Button>
                  {item.active ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === item.id}
                      onClick={() =>
                        void executar(item, () =>
                          inactivateMaintenanceItem(item.type, item.id),
                        )
                      }
                    >
                      Inativar
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={busy === item.id}
                      onClick={() =>
                        void executar(item, () =>
                          reactivateMaintenanceItem(item.type, item.id),
                        )
                      }
                    >
                      Reativar
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        <Pagination
          page={page}
          pageSize={TAMANHO_PAGINA}
          total={total}
          totalPages={Math.max(1, Math.ceil(total / TAMANHO_PAGINA))}
          onChange={(nova) => {
            setPage(nova);
            buscar();
          }}
        />
      </Card>

      {editando ? (
        <MaintenanceEditModal
          key={editando.id}
          item={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            recarregarTudo();
          }}
        />
      ) : null}
    </div>
  );
}

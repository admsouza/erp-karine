import { useEffect, useState } from 'react';
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
  inactivateMaintenanceItem,
  listMaintenance,
  reactivateMaintenanceItem,
} from '../api/maintenance-api';
import { MaintenanceEditModal } from '../components/MaintenanceEditModal';
import {
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
  const [itens, setItens] = useState<MaintenanceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState<MaintenanceItem | null>(null);
  const [recarregar, setRecarregar] = useState(0);

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
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [type, busca, active, page, recarregar]);

  async function executar(
    item: MaintenanceItem,
    trabalho: () => Promise<unknown>,
  ) {
    setBusy(item.id);
    setError(null);
    try {
      await trabalho();
      setRecarregar((x) => x + 1);
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
            setLoading(true);
            setPage(1);
            setBusca(search.trim());
          }}
        >
          <Select
            label="Cadastro"
            value={type}
            onChange={(e) => {
              setLoading(true);
              setType(e.target.value as MaintenanceType);
              setPage(1);
            }}
            options={MAINTENANCE_TYPE_ORDER.map((valor) => ({
              value: valor,
              label: MAINTENANCE_TYPES[valor],
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
              setLoading(true);
              setActive(e.target.value as 'true' | 'false' | '');
              setPage(1);
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
            title="Nenhum cadastro encontrado"
            description="Ajuste o filtro ou cadastre pela tela do módulo — a manutenção não cria registros."
          />
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
            setLoading(true);
            setPage(nova);
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
            setRecarregar((x) => x + 1);
          }}
        />
      ) : null}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { describeApiError } from '../../../shared/api/http-client';
import { Badge } from '../../../shared/components/Badge';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Pagination } from '../../../shared/components/Pagination';
import { Select } from '../../../shared/components/Select';
import { formatCentsToBRL } from '../../../shared/utils/format';
import { listProducts, setProductActive } from '../api/products-api';
import { ProductFormModal } from '../components/ProductFormModal';
import type { Product } from '../types/product';

const TAMANHO_PAGINA = 20;

/**
 * Catálogo de produtos: itens vendidos ao cliente, comprados de credor, ou ambos.
 *
 * O `loading` é **derivado** de um token de busca (decisão 7.51) — ação que não muda filtro
 * nenhum não pode deixar a tela presa em "Carregando…".
 */
export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [busca, setBusca] = useState('');
  const [active, setActive] = useState<'true' | 'false' | ''>('');
  const [page, setPage] = useState(1);
  const [token, setToken] = useState(0);
  const [carregadoToken, setCarregadoToken] = useState(-1);
  const [itens, setItens] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [editando, setEditando] = useState<Product | null>(null);
  const [criando, setCriando] = useState(false);
  const loading = carregadoToken !== token;

  const buscar = () => setToken((atual) => atual + 1);

  useEffect(() => {
    const controller = new AbortController();
    listProducts(
      {
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
        setError(null);
      })
      .catch((falha) => {
        if (!controller.signal.aborted) setError(describeApiError(falha));
      })
      .finally(() => {
        if (!controller.signal.aborted) setCarregadoToken(token);
      });
    return () => controller.abort();
  }, [busca, active, page, token]);

  async function executar(produto: Product, ativo: boolean) {
    setBusy(produto.id);
    setError(null);
    try {
      await setProductActive(produto.id, ativo);
      buscar();
    } catch (falha) {
      setError(describeApiError(falha));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Produtos"
        description="Cadastre produtos para venda ao cliente, compra de credor ou ambos. O lançamento preserva o valor aplicado."
        actions={<Button onClick={() => setCriando(true)}>Novo produto</Button>}
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
          <Input
            label="Busca"
            hint="Nome ou descrição"
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
          <p className="text-sm text-slate-500">Carregando produtos…</p>
        ) : itens.length === 0 ? (
          <EmptyState
            title={
              busca || active
                ? 'Nenhum produto com esse filtro'
                : 'Nenhum produto cadastrado'
            }
            description="Cadastre o que a clínica vende além dos procedimentos — depois ele aparece no seletor do lançamento."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {itens.map((produto) => (
              <li
                key={produto.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-800">{produto.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatCentsToBRL(produto.priceCents)}
                    {produto.unit ? ` · ${produto.unit}` : ''}
                    {produto.description ? ` · ${produto.description}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={produto.active ? 'success' : 'neutral'}>
                    {produto.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditando(produto)}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant={produto.active ? 'danger' : 'secondary'}
                    disabled={busy === produto.id}
                    onClick={() => void executar(produto, !produto.active)}
                  >
                    {produto.active ? 'Inativar' : 'Reativar'}
                  </Button>
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

      {criando ? (
        <ProductFormModal
          onClose={() => setCriando(false)}
          onSaved={() => {
            setCriando(false);
            buscar();
          }}
        />
      ) : null}
      {editando ? (
        <ProductFormModal
          key={editando.id}
          product={editando}
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            buscar();
          }}
        />
      ) : null}
    </div>
  );
}

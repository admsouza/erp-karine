import { useState } from 'react';
import { Button } from '../../../shared/components/Button';
import { Card, EmptyState } from '../../../shared/components/Card';
import { Input } from '../../../shared/components/Input';
import { Pagination } from '../../../shared/components/Pagination';
import { PageHeader } from '../../../shared/components/PageHeader';
import { Select } from '../../../shared/components/Select';
import { describeApiError } from '../../../shared/api/http-client';
import { setProcedureActive } from '../api/procedures-api';
import { ProcedureFormModal } from '../components/ProcedureFormModal';
import { ProceduresTable } from '../components/ProceduresTable';
import { useProcedures } from '../hooks/useProcedures';
import type { Procedure } from '../types/procedure';

const SITUACAO_OPTIONS = [
  { value: 'true', label: 'Somente ativos' },
  { value: 'false', label: 'Somente inativos' },
  { value: '', label: 'Todos' },
];

export function ProceduresPage() {
  const { dados, loading, erro, search, situacao, changeSearch, changeSituacao, changePage, reload } =
    useProcedures();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Procedure | null>(null);
  const [ocupadoId, setOcupadoId] = useState<string | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  function abrirNovo() {
    setEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(procedure: Procedure) {
    setEditando(procedure);
    setModalAberto(true);
  }

  async function alternarSituacao(procedure: Procedure) {
    setOcupadoId(procedure.id);
    setErroAcao(null);
    try {
      await setProcedureActive(procedure.id, !procedure.active);
      reload();
    } catch (falha) {
      setErroAcao(describeApiError(falha));
    } finally {
      setOcupadoId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procedimentos"
        description="Catálogo de procedimentos da clínica: valores e duração padrão usados na agenda e nos protocolos."
        actions={<Button onClick={abrirNovo}>Novo procedimento</Button>}
      />

      <Card>
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <Input
            label="Buscar"
            placeholder="Nome ou descrição"
            value={search}
            onChange={(evento) => changeSearch(evento.target.value)}
          />
          <Select
            label="Situação"
            options={SITUACAO_OPTIONS}
            value={situacao}
            onChange={(evento) => changeSituacao(evento.target.value as 'true' | 'false' | '')}
          />
        </div>
      </Card>

      {erroAcao ? (
        <p className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{erroAcao}</p>
      ) : null}

      <Card>
        {loading ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">Carregando procedimentos…</p>
        ) : erro ? (
          <p className="px-4 py-8 text-center text-sm text-rose-600">{erro}</p>
        ) : dados && dados.items.length > 0 ? (
          <>
            <ProceduresTable
              procedures={dados.items}
              busyId={ocupadoId}
              onEdit={abrirEdicao}
              onToggleActive={alternarSituacao}
            />
            <Pagination
              page={dados.page}
              pageSize={dados.pageSize}
              total={dados.total}
              totalPages={dados.totalPages}
              onChange={changePage}
            />
          </>
        ) : (
          <EmptyState
            title="Nenhum procedimento no catálogo"
            description="Ajuste a busca ou cadastre o primeiro procedimento da clínica."
          />
        )}
      </Card>

      <ProcedureFormModal
        key={editando?.id ?? 'novo'}
        open={modalAberto}
        procedure={editando}
        onClose={() => setModalAberto(false)}
        onSaved={reload}
      />
    </div>
  );
}

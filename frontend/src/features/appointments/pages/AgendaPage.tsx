import { Card, EmptyState } from '../../../shared/components/Card';
import { PageHeader } from '../../../shared/components/PageHeader';

/** Agenda — implementado na Fase 4 (ver TASKS.md). */
export function AgendaPage() {
  return (
    <>
      <PageHeader title="Agenda" description="Atendimentos do dia, da semana e por período." />

      <Card title="Agendamentos">
        <EmptyState
          title="Nenhum agendamento carregado"
          description="Agenda diária, semanal e filtros por cliente e status entram na Fase 4."
        />
      </Card>
    </>
  );
}

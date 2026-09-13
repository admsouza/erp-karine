import { Card, EmptyState } from '../components/Card';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { CalendarIcon, ClientsIcon, FinancialIcon, SubscriptionIcon } from '../components/Icons';

/**
 * Fase 1: estrutura visual do dashboard.
 * Os números reais chegam na Fase 9, quando o endpoint /api/dashboard existir.
 */
export function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral da clínica: faturamento, clientes e agenda."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Faturamento do mês"
          value="—"
          hint="Disponível na Fase 9"
          icon={<FinancialIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Clientes cadastrados"
          value="—"
          hint="Disponível na Fase 9"
          icon={<ClientsIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Agendamentos de hoje"
          value="—"
          hint="Disponível na Fase 9"
          icon={<CalendarIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Assinaturas ativas"
          value="—"
          hint="Disponível na Fase 9"
          icon={<SubscriptionIcon className="h-5 w-5" />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Próximos atendimentos" description="Agenda dos próximos dias">
          <EmptyState
            title="Nenhum atendimento carregado"
            description="A lista de próximos atendimentos será exibida aqui após a implementação dos módulos de agenda e dashboard."
          />
        </Card>

        <Card title="Agendamentos do mês" description="Distribuição por status">
          <EmptyState
            title="Sem dados no período"
            description="Resumo mensal de agendamentos (agendados, confirmados, realizados, cancelados e faltas)."
          />
        </Card>
      </div>
    </>
  );
}

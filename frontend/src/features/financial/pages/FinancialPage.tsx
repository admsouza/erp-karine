import { Card, EmptyState } from '../../../shared/components/Card';
import { PageHeader } from '../../../shared/components/PageHeader';

/** Financeiro — implementado na Fase 6 (ver TASKS.md). */
export function FinancialPage() {
  return (
    <>
      <PageHeader title="Financeiro" description="Receitas, formas de pagamento e faturamento por período." />

      <Card title="Lançamentos financeiros">
        <EmptyState
          title="Nenhum lançamento carregado"
          description="Registro de receitas, faturamento por período/procedimento e indicadores entram na Fase 6."
        />
      </Card>
    </>
  );
}

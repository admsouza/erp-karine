import { Card, EmptyState } from '../../../shared/components/Card';
import { PageHeader } from '../../../shared/components/PageHeader';

/** Assinaturas — implementado na Fase 5 (ver TASKS.md). */
export function SubscriptionsPage() {
  return (
    <>
      <PageHeader title="Assinaturas" description="Planos da clínica e assinaturas dos clientes." />

      <Card title="Assinaturas">
        <EmptyState
          title="Nenhuma assinatura carregada"
          description="Cadastro de planos, assinaturas e pagamentos entra na Fase 5."
        />
      </Card>
    </>
  );
}

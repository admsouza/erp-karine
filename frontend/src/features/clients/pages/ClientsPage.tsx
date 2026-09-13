import { Card, EmptyState } from '../../../shared/components/Card';
import { PageHeader } from '../../../shared/components/PageHeader';

/** Clientes — implementado na Fase 2 (ver TASKS.md). */
export function ClientsPage() {
  return (
    <>
      <PageHeader title="Clientes" description="Cadastro e histórico dos clientes da clínica." />

      <Card title="Clientes">
        <EmptyState
          title="Nenhum cliente carregado"
          description="A listagem, a busca e o cadastro de clientes entram na Fase 2."
        />
      </Card>
    </>
  );
}

import { Card, EmptyState } from '../components/Card';
import { PageHeader } from '../components/PageHeader';

/** Exames — implementado na Fase 8 (ver TASKS.md). */
export function ExamsPage() {
  return (
    <>
      <PageHeader title="Exames" description="Recomendações de exames registradas pela profissional." />

      <Card title="Recomendações">
        <EmptyState
          title="Nenhuma recomendação carregada"
          description="Registro de exames recomendados e visualização para impressão entram na Fase 8."
        />
      </Card>
    </>
  );
}

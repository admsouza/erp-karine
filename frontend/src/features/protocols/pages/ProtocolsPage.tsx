import { Card, EmptyState } from '../../../shared/components/Card';
import { PageHeader } from '../../../shared/components/PageHeader';

/** Protocolos — implementado na Fase 7 (ver TASKS.md). */
export function ProtocolsPage() {
  return (
    <>
      <PageHeader title="Protocolos" description="Fichas de protocolo e evolução por sessão." />

      <Card title="Fichas de protocolo">
        <EmptyState
          title="Nenhuma ficha carregada"
          description="Fichas de protocolo, sessões e histórico cronológico entram na Fase 7."
        />
      </Card>
    </>
  );
}

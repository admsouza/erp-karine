import { Card, EmptyState } from '../components/Card';
import { PageHeader } from '../components/PageHeader';

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

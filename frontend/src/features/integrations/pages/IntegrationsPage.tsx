import { Badge } from '../../../shared/components/Badge';
import { Card, EmptyState } from '../../../shared/components/Card';
import { PageHeader } from '../../../shared/components/PageHeader';

/** Pontos de integração que já existem no sistema e serão a base do agente de IA. */
const PONTOS = [
  {
    titulo: 'Trilha de auditoria (somente leitura)',
    descricao: 'Toda alteração relevante fica registrada com autor, motivo e valores antes/depois. É a fonte natural para um agente entender o que mudou e quando.',
    estado: 'Disponível',
  },
  {
    titulo: 'Eventos de domínio',
    descricao: 'O sistema já publica fatos como "atendimento realizado" e "pagamento de assinatura recebido", consumidos pelo financeiro. O agente poderá assinar os mesmos eventos.',
    estado: 'Disponível',
  },
  {
    titulo: 'Consultas por contrato público',
    descricao: 'Clientes, procedimentos, agenda, assinaturas e financeiro expõem serviços de consulta. O agente consulta por esses contratos, sem tocar em tabela de módulo.',
    estado: 'Disponível',
  },
  {
    titulo: 'Ações assistidas pelo agente',
    descricao: 'Ler a agenda, sugerir retorno, montar relatório e preparar lançamentos para conferência humana. Nada é executado sem revisão.',
    estado: 'Em preparação',
  },
  {
    titulo: 'Webhooks e notificações',
    descricao: 'Avisar sistemas externos (mensageria, automação) quando um fato acontece.',
    estado: 'Em preparação',
  },
];

export function IntegrationsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Integração"
        description="Área preparada para o agente de IA e para integrações externas."
      />

      <Card>
        <p className="text-sm text-slate-600">
          Nada aqui executa ação automática ainda. O objetivo desta tela é deixar visível
          <strong> o que o sistema já oferece</strong> como ponto de integração e o que está sendo preparado,
          para a ligação com o agente de IA ser feita em cima de contrato, não de acesso direto ao banco.
        </p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {PONTOS.map((ponto) => (
          <Card key={ponto.titulo}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-900">{ponto.titulo}</h2>
              <Badge tone={ponto.estado === 'Disponível' ? 'success' : 'warning'}>{ponto.estado}</Badge>
            </div>
            <p className="mt-2 text-sm text-slate-600">{ponto.descricao}</p>
          </Card>
        ))}
      </div>

      <Card>
        <EmptyState
          title="Agente de IA ainda não conectado"
          description="Quando for implementado, ele vai operar nesta área: credencial própria, escopo de leitura definido e toda ação registrada na auditoria."
        />
      </Card>
    </div>
  );
}

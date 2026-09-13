# MODULES.md — Contratos dos módulos

> **Consultar antes de criar ou alterar qualquer módulo.**
> Cada módulo é dono das suas entidades e do seu acesso a dados. Nenhum módulo lê ou
> escreve tabela de outro módulo: quando precisa de informação, usa o **serviço público**
> do módulo dono (ver "Regras de dependência" em `ARCHITECTURE.md`).

Estado: `[ ]` planejado · `[~]` esqueleto criado · `[x]` implementado

| Módulo | Estado | Fase |
| ------ | ------ | ---- |
| health | `[x]` | 1 |
| clients | `[~]` | 2 |
| procedures | `[~]` | 3 |
| appointments | `[~]` | 4 |
| subscriptions | `[~]` | 5 |
| financial | `[~]` | 6 |
| protocols | `[~]` | 7 |
| exams | `[~]` | 8 |
| dashboard | `[~]` | 9 |

---

## health (infraestrutura — `src/common/health`)

**Responsabilidade:** informar se a API e o banco estão respondendo. Não é módulo de domínio.

**Entidades:** nenhuma.

**API pública:** `GET /api/health`.

**Depende de:** `DatabaseModule` (verificação com `SELECT 1`).

---

## clients

**Responsabilidade:** cadastro e manutenção do cliente da clínica (dados pessoais e
situação ativo/inativo). É o módulo dono da identidade do cliente.

**Entidades:** `Client`.

**Serviços públicos (previstos):**
- `ClientService` — criar, editar, inativar, reativar.
- `ClientQueryService` — buscar por id, listar/pesquisar, verificar existência.

**Eventos emitidos:** `ClientDeactivated` (previsto, quando houver consumidor real).

**Eventos consumidos:** nenhum.

**Dependências permitidas:** nenhuma (módulo base).

**Endpoints (previstos):**

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| POST | `/api/clients` | cadastrar |
| GET | `/api/clients` | listar/pesquisar (paginado) |
| GET | `/api/clients/:id` | visualizar |
| PATCH | `/api/clients/:id` | editar |
| PATCH | `/api/clients/:id/inactivate` | inativar |
| PATCH | `/api/clients/:id/reactivate` | reativar |

**Regras principais (implementadas):**
- CPF normalizado (só dígitos) e validado por dígito verificador; **único** quando informado
  (409 `Já existe um cliente com este CPF.`).
- Data de nascimento não pode ser futura; e-mail validado; campos extras recusados
  (`forbidNonWhitelisted`).
- Listagem paginada (padrão 20, máx. 100) com busca por nome, CPF, telefone, WhatsApp e
  e-mail (case-insensitive) e filtro `active=true|false` — contrato explícito em texto para
  não cair na conversão implícita de booleano do `ValidationPipe`.
- Nunca excluir cliente: `active = false` + `deactivatedAt` (a API não expõe DELETE).
  Inativar duas vezes devolve 409; reativar limpa `deactivatedAt`.
  Exclusão física só por decisão explícita e sem histórico vinculado (`deletedAt` existe para isso).
- Busca por nome, CPF, telefone e WhatsApp; listagem sempre paginada.
- A página do cliente agrega dados de outros módulos **via serviços públicos deles**, sem
  duplicar regra de negócio.

---

## procedures

**Responsabilidade:** catálogo de procedimentos da clínica (nome, descrição, duração,
valor padrão, ativo).

**Entidades:** `Procedure`.

**Serviços públicos (previstos):**
- `ProcedureService` — criar, editar, inativar.
- `ProcedureQueryService` — buscar por id, listar ativos.

**Eventos:** emite nenhum; consome nenhum.

**Dependências permitidas:** nenhuma (módulo base).

**Endpoints (previstos):** `POST/GET/GET :id/PATCH /api/procedures`, `PATCH /api/procedures/:id/inactivate`.

**Regras principais:**
- Outros módulos referenciam procedimento **por id** e guardam um *snapshot* do nome/valor
  quando o dado precisa sobreviver a mudanças de cadastro (é o caso de `Appointment`).
- Procedimento não é excluído: `active = false`.

---

## appointments

**Responsabilidade:** agenda da clínica — quem é atendido, quando, por quem, com qual
procedimento, por qual valor e em que situação.

**Entidades:** `Appointment` (dona). Referencia `Client` e `Procedure` por id.

**Serviços públicos (previstos):**
- `AppointmentService` — agendar, reagendar, confirmar, realizar, cancelar, registrar falta.
- `AppointmentQueryService` — agenda do dia, agenda da semana, por período, por cliente,
  por status; contagens para o dashboard.

**Eventos emitidos:** `AppointmentCompleted` (previsto — o financeiro reage sem que
appointments conheça a implementação financeira).

**Eventos consumidos:** nenhum.

**Dependências permitidas:** `clients` (serviço público), `procedures` (serviço público).

**Não depende de:** `financial`.

**Endpoints (previstos):** CRUD + `PATCH /api/appointments/:id/status`; consultas
`/api/appointments/agenda/diaria`, `/agenda/semanal`, `/por-periodo`.

**Regras principais:**
- Status: `AGENDADO`, `CONFIRMADO`, `REALIZADO`, `CANCELADO`, `FALTOU`.
- `procedureName` e `valueCents` são *snapshot* no momento do agendamento.
- Não existe exclusão: cancelar é mudança de status.

---

## subscriptions

**Responsabilidade:** planos da clínica, assinaturas contratadas por cliente e os
pagamentos dessas assinaturas.

**Entidades:** `SubscriptionPlan`, `ClientSubscription`, `SubscriptionPayment`.

**Serviços públicos (previstos):**
- `SubscriptionPlanService` / `SubscriptionPlanQueryService`.
- `SubscriptionService` — contratar, cancelar, encerrar, marcar inadimplente.
- `SubscriptionPaymentService` — registrar pagamento.
- `SubscriptionQueryService` — assinaturas por cliente, assinaturas ativas.

**Eventos emitidos:** `SubscriptionPaymentReceived` (previsto).

**Eventos consumidos:** nenhum.

**Dependências permitidas:** `clients` (serviço público).

**Não depende de:** `financial`.

**Endpoints (previstos):** `/api/subscription-plans`, `/api/subscriptions`,
`/api/subscriptions/:id/payments`.

**Regras principais:**
- Status da assinatura: `ATIVA`, `CANCELADA`, `ENCERRADA`, `INADIMPLENTE`.
- Periodicidade: `MENSAL`, `BIMESTRAL`, `TRIMESTRAL`, `SEMESTRAL`, `ANUAL`.
- Plano não é excluído: `active = false`.
- Pagamento de assinatura é dado do módulo subscriptions; o lançamento em financeiro é
  responsabilidade do módulo financial (reagindo ao evento/contrato).

---

## financial

**Responsabilidade:** receitas da clínica — origens, formas de pagamento, categorias e
indicadores de faturamento. **Não** decide se um atendimento existe nem se uma assinatura
está ativa: pergunta ao módulo dono.

**Entidades:** `FinancialTransaction`.

**Serviços públicos (previstos):**
- `FinancialTransactionService` — lançar receita, cancelar lançamento, garantir idempotência.
- `FinancialQueryService` — faturamento do mês, por período, por procedimento, por
  assinatura, quantidade de recebimentos.

**Eventos emitidos:** nenhum (por ora).

**Eventos consumidos:** `AppointmentCompleted`, `SubscriptionPaymentReceived`.

**Dependências permitidas:** `appointments` e `subscriptions` **apenas via serviço público
de consulta** (`AppointmentQueryService`, `SubscriptionQueryService`).

**Endpoints (previstos):** `POST/GET /api/financial/transactions`,
`GET /api/financial/summary`.

**Regras principais:**
- `origin`: `APPOINTMENT`, `SUBSCRIPTION`, `MANUAL`.
- `paymentMethod`: `PIX`, `DINHEIRO`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `TRANSFERENCIA`, `OUTRO`.
- **Anti-duplicidade:** `appointmentId` e `subscriptionPaymentId` são únicos; o serviço
  recusa lançamento repetido para a mesma origem/referência.
- `externalReference` guarda referência externa livre (conciliação).
- Valores em centavos. Regra financeira nunca no frontend.

---

## protocols

**Responsabilidade:** fichas de protocolo clínico do cliente e suas sessões (histórico).

**Entidades:** `Protocol`, `ProtocolSession`.

**Serviços públicos (previstos):**
- `ProtocolService` — abrir ficha, editar dados administrativos, inativar.
- `ProtocolSessionService` — registrar sessão (somente acréscimo).
- `ProtocolQueryService` — fichas por cliente, histórico cronológico.

**Eventos:** emite nenhum; consome nenhum.

**Dependências permitidas:** `clients` (serviço público), `procedures` (opcional, ao
referenciar o procedimento realizado).

**Endpoints (previstos):** `/api/protocols`, `/api/protocols/:id/sessions`,
`GET /api/clients/:id/protocols`.

**Regras principais:**
- **Nunca sobrescrever histórico clínico.** Sessão é acrescentada; correção gera novo
  registro ou anotação, nunca substituição silenciosa.
- Ficha inativa continua legível (soft delete via `active`/`deletedAt`).
- Ficha é impressa/exportada como visualização; o módulo não emite diagnóstico.

---

## exams

**Responsabilidade:** registrar exames recomendados ao cliente (o que foi recomendado,
por quê, quando e em que situação).

**Entidades:** `ExamRecommendation`, `ExamRecommendationItem`.

**Serviços públicos (previstos):**
- `ExamRecommendationService` — criar recomendação com vários exames, alterar status.
- `ExamRecommendationQueryService` — recomendações por cliente.

**Eventos:** emite nenhum; consome nenhum.

**Dependências permitidas:** `clients` (serviço público).

**Endpoints (previstos):** `POST/GET /api/exam-recommendations`,
`PATCH /api/exam-recommendations/:id/status`, `GET /api/clients/:id/exam-recommendations`.

**Regras principais:**
- Status: `RECOMENDADO`, `REALIZADO`, `CANCELADO`.
- Uma recomendação agrupa vários itens de exame.
- **O sistema apenas registra** uma recomendação profissional — não há diagnóstico
  automático, interpretação de resultado nem sugestão de conduta.
- Visualização limpa, preparada para impressão/PDF.

---

## dashboard

**Responsabilidade:** **somente consulta e agregação** para a tela inicial. Não contém
regra de negócio e não é dono de nenhuma entidade.

**Entidades:** nenhuma (não escreve no banco).

**Serviços públicos:** `DashboardService` (composição das consultas).

**Eventos:** não emite nem consome.

**Dependências permitidas:** **serviços públicos de consulta** de `clients`,
`appointments`, `subscriptions` e `financial`.

**Endpoints (previstos):** `GET /api/dashboard/summary`.

**Regras principais:**
- Indicadores: faturamento do mês, clientes cadastrados, atendimentos do dia, atendimentos
  do mês, assinaturas ativas, próximos atendimentos.
- Nenhum `SELECT` direto em tabela de outro módulo: sempre pelo serviço do dono.
- Se um indicador exigir regra nova, a regra nasce no módulo dono do dado, não aqui.

---

## Como registrar um módulo novo

Módulos previstos para o futuro (Estoque, Comissões, Prontuário, Fotos clínicas, Usuários,
Profissionais, WhatsApp, Relatórios, Documentos, Consentimentos) devem ser criados como
**módulo novo**, consumindo apenas contratos públicos já existentes. Antes de tocar em
módulo estável, responda:

1. Dá para resolver com um módulo novo, sem alterar os existentes?
2. Se não, qual contrato público precisa mudar e quem mais consome esse contrato?
3. A alteração é compatível? Se não, existe migração gradual?

Depois de criar/alterar: atualizar **este arquivo**, `ARCHITECTURE.md` (se houve decisão
estrutural), `TASKS.md` e `CHANGELOG.md`.

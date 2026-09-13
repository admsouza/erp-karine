# MODULES.md — Contratos dos módulos

> **Consultar antes de criar ou alterar qualquer módulo.**
> Cada módulo é dono das suas entidades e do seu acesso a dados. Nenhum módulo lê ou
> escreve tabela de outro módulo: quando precisa de informação, usa o **serviço público**
> do módulo dono (ver "Regras de dependência" em `ARCHITECTURE.md`).

Estado: `[ ]` planejado · `[~]` esqueleto criado · `[x]` implementado

Atualização de infraestrutura de 2026-09-13: dependências corrigidas sem alterar entidades,
serviços públicos, eventos, endpoints ou regras dos módulos descritos neste documento.

| Módulo | Estado | Fase |
| ------ | ------ | ---- |
| health | `[x]` | 1 |
| clients | `[~]` | 2 |
| procedures | `[~]` | 3 |
| appointments | `[x]` | 4 |
| subscriptions | `[x]` | 5 |
| financial | `[x]` | 6 |
| protocols | `[x]` | 7 |
| exams | `[~]` | 8 |
| dashboard | `[~]` | 9 |

---

## health (infraestrutura — `src/common/health`)

**Responsabilidade:** informar se a API e o banco estão respondendo. Não é módulo de domínio.

**Entidades:** nenhuma.

**API pública:** `GET /api/health`.

**Depende de:** `DatabaseModule` (verificação com `SELECT 1`).

---

## auth

**Responsabilidade:** autenticação e sessão. Não conhece regra de negócio da clínica.

**Depende de:** nada (usa `common/database`).

**Não depende de:** nenhum módulo de domínio.

**Entidades:** `User` (e-mail único, hash bcrypt, perfil, ativo, `mustChangePassword`), `Session` (hash do token, expiração, revogação, IP/user-agent).

**Serviços públicos:** `AuthService` (login, logout, troca de senha, `me`), `SessionService` (emitir/resolver/revogar sessão).

**Eventos:** nenhum.

**Endpoints:**

| Método | Rota | Descrição | Sessão |
| ------ | ---- | --------- | ------ |
| POST | `/api/auth/login` | autentica e abre a sessão | pública |
| POST | `/api/auth/logout` | encerra a sessão atual | exigida |
| GET | `/api/auth/me` | usuário da sessão | exigida |
| POST | `/api/auth/password` | troca a própria senha e derruba as outras sessões | exigida |

**Regras principais:**

- Toda rota de `/api` exige sessão, exceto `@Public()` (`GET /api/health` e o login). Rota inexistente também responde 401 sem sessão, para não vazar existência.
- Senha nunca é devolvida pela API; hash com bcrypt (custo 10).
- Token de sessão é aleatório de 32 bytes, guardado **hasheado** (sha256) no banco; o cookie é `httpOnly`, `SameSite=Lax`, `Secure` em produção.
- Sessão vale 7 dias com renovação a cada uso; logout e troca de senha revogam no servidor.
- 5 tentativas erradas bloqueiam o par (IP, e-mail) por 15 minutos (429).
- Requisição de escrita com `Origin` de outro site recebe 403 (defesa de CSRF, via `OriginGuard`).
- Senha mínima: 8 caracteres, com letras e números; não pode ser igual ao e-mail. Senha temporária obriga troca no primeiro acesso.
- Documentação Swagger também exige sessão (validada por middleware, porque o Swagger não passa pelos guards do Nest).

**Ao criar usuários em produção:** `node dist/scripts/create-user.js --email <email> --password <senha> --name <nome>` (idempotente por e-mail).

**Criado na:** Fase 2.5 (antes da Fase 3), por segurança do dado de paciente.

---

## clients

**Responsabilidade:** cadastro e manutenção do cliente da clínica (dados pessoais e
situação ativo/inativo). É o módulo dono da identidade do cliente.

**Entidades:** `Client`.

**Estado:** implementado (Fase 2) — backend, frontend e testes.

**Serviços públicos:**
- `ClientService` — criar, editar, inativar, reativar.
- `ClientQueryService` — buscar por id, listar/pesquisar, verificar existência.

**Eventos emitidos:** `ClientDeactivated` (previsto, quando houver consumidor real).

**Eventos consumidos:** nenhum.

**Dependências permitidas:** nenhuma (módulo base).

**Endpoints (implementados, todos com Swagger):**

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
- Busca por nome, CPF, telefone, WhatsApp e e-mail (case-insensitive); listagem sempre
  paginada (padrão 20, máx. 100). O filtro de situação é o contrato **em texto**
  `active=true|false`, para não cair na conversão implícita de booleano do `ValidationPipe`
  (bug real corrigido na Fase 2).
- A página do cliente agrega dados de outros módulos **via serviços públicos deles**, sem
  duplicar regra de negócio.

---

## procedures

**Responsabilidade:** catálogo de procedimentos da clínica (nome, descrição, duração,
valor padrão, ativo).

**Estado:** implementado (Fase 3).

**Entidades:** `Procedure`.

**Serviços públicos:**
- `ProcedureService` — criar, editar, inativar, reativar.
- `ProcedureQueryService` — buscar por id, listar/pesquisar, verificar existência e
  **`valueOn(id, data)`**: o valor unitário que valia em um dia. **É o contrato que agenda,
  protocolos e financeiro usam para referenciar procedimento pelo id.**
- `ProcedurePriceService` — série histórica de valores (interna ao módulo).

**Entidades:** `Procedure` (com `unit`: unidade de medida) e `ProcedurePrice` (vigência de valor).

**Eventos:** emite nenhum; consome nenhum.

**Dependências permitidas:** nenhuma (módulo base).

**Endpoints (implementados, todos com Swagger):**

| Método | Rota | Descrição |
| ------ | ---- | --------- |
| POST | `/api/procedures` | cadastrar |
| GET | `/api/procedures` | listar/pesquisar (paginado) |
| GET | `/api/procedures/:id` | detalhar |
| PATCH | `/api/procedures/:id` | editar |
| PATCH | `/api/procedures/:id/inactivate` | inativar |
| PATCH | `/api/procedures/:id/reactivate` | reativar |
| GET | `/api/procedures/:id/prices` | histórico de valores (vigências) |
| POST | `/api/procedures/:id/prices` | novo valor: cria vigência e fecha a anterior |
| DELETE | `/api/procedures/:id/prices/:priceId` | remove vigência (correção) |
| PATCH | `/api/procedures/:id/prices/:priceId` | corrige valor/observação da vigência **atual** |
| GET | `/api/procedures/:id/price-on?date=AAAA-MM-DD` | valor que valia na data |

**Regras principais (implementadas):**
- Nome **único** (409 `Já existe procedimento com este nome.`), mínimo de 3 caracteres.
- **Unidade de medida** (`unit`) em lista fixa: `SESSAO` (padrão), `APLICACAO`, `REGIAO`, `ML`,
  `UNIDADE`, `HORA`, `PACOTE` — é a base de cobrança ("R$ 900,00 / região").
- **Valor unitário em centavos (`Int`)** e com **vigência**: `ProcedurePrice` guarda
  `valueCents`, `validFrom`, `validTo` (nulo = vigência atual) e observação.
- O histórico **não é reescrito**: novo valor cria uma vigência e fecha a anterior no dia em que a
  nova começa; remover a vigência atual faz a anterior voltar a valer (correção), e o único valor
  do procedimento não pode ser removido (409).
- Vigência só pode começar **depois** da mais recente (409) — nada de reescrever o passado.
- O valor **não é editável** no `PATCH /api/procedures/:id` (400): preço muda só por vigência.
- **Correção:** a vigência **atual** (em aberto) pode ser corrigida por
  `PATCH /api/procedures/:id/prices/:priceId` (valor e observação) — é o caminho para ajustar um
  valor já gravado sem criar vigência nova. Vigência **encerrada não é editável** (409): o passado
  é o que foi praticado. A unidade, por ser propriedade do procedimento, é editada no cadastro.
- Datas são "puras" (`DATE`), calculadas no fuso da clínica (`America/Recife`) para a virada do dia
  não acontecer às 21h.
- Quem consome (financeiro/agenda) deve usar `valueOn(id, data)` e **gravar o valor aplicado** no
  próprio registro — o preço do passado não pode ser recalculado com o preço de hoje.
- Duração em minutos, inteiro, entre 5 e 600, ou vazio.
- Nunca excluir: `active = false` (409 ao repetir); reativar devolve ao catálogo.
- Listagem ordenada por nome, paginada, com busca por nome/descrição e filtro `active=true|false`
  (contrato em texto, pelo mesmo motivo do módulo de clientes).

**Regras principais:**
- Outros módulos referenciam procedimento **por id** e guardam um *snapshot* do nome/valor
  quando o dado precisa sobreviver a mudanças de cadastro (é o caso de `Appointment`).
- Procedimento não é excluído: `active = false`.

---

## appointments

**Responsabilidade:** agenda da clínica — quem é atendido, quando, por quem, com qual
procedimento, por qual valor e em que situação.

**Entidades:** `Appointment` (dona). Referencia `Client` e `Procedure` por id.

**Estado:** implementado (Fase 4) — backend, frontend e testes.

**Serviços públicos:**
- `AppointmentService` — agendar, reagendar, confirmar, realizar, cancelar, registrar falta.
- `AppointmentQueryService` — agenda do dia, agenda da semana, por período, por cliente,
  por status; contagens para o dashboard.

**Eventos emitidos:** `AppointmentCompleted` (previsto — o financeiro reage sem que
appointments conheça a implementação financeira).

**Eventos consumidos:** nenhum.

**Dependências permitidas:** `clients` (serviço público), `procedures` (serviço público).

**Não depende de:** `financial`.

**Endpoints (implementados):** `POST/GET /api/appointments`, `GET/PATCH /api/appointments/:id`,
`PATCH /api/appointments/:id/status`, `/api/appointments/agenda/diaria` e `/agenda/semanal`.
O `GET` geral filtra período (`from`/`to`), cliente e status.

**Regras principais:**
- Status: `AGENDADO`, `CONFIRMADO`, `REALIZADO`, `CANCELADO`, `FALTOU`.
- `procedureName`, `procedureUnit`, `quantity`, `unitValueCents` e `valueCents` são *snapshot*.
- Cliente e procedimento precisam existir e estar ativos; deve haver valor vigente na data.
- `AGENDADO` → `CONFIRMADO`, `CANCELADO` ou `FALTOU`; `CONFIRMADO` → `REALIZADO`, `CANCELADO` ou `FALTOU`.
- Estados finais não transitam nem podem ser editados.
- Não existe exclusão: cancelar é mudança de status.

---

## subscriptions

**Responsabilidade:** planos da clínica, assinaturas contratadas por cliente e os
pagamentos dessas assinaturas.

**Entidades:** `SubscriptionPlan`, `ClientSubscription`, `SubscriptionPayment`.

**Estado:** implementado (Fase 5) — backend, frontend e testes.

**Serviços públicos:**
- `SubscriptionPlanService` / `SubscriptionPlanQueryService`.
- `SubscriptionService` — contratar, cancelar, encerrar, marcar inadimplente.
- `SubscriptionPaymentService` — registrar pagamento.
- `SubscriptionQueryService` — assinaturas por cliente, assinaturas ativas.

**Eventos emitidos:** `SubscriptionPaymentReceived` (previsto).

**Eventos consumidos:** nenhum.

**Dependências permitidas:** `clients` (serviço público).

**Não depende de:** `financial`.

**Endpoints (implementados):** `POST/GET /api/subscription-plans`, `GET/PATCH /api/subscription-plans/:id`, `PATCH /api/subscription-plans/:id/inactivate|reactivate`; `POST/GET /api/subscriptions`, `GET /api/subscriptions/:id`, `PATCH /api/subscriptions/:id/status` e `POST/GET /api/subscriptions/:id/payments`.

**Regras principais:**
- Status da assinatura: `ATIVA`, `CANCELADA`, `ENCERRADA`, `INADIMPLENTE`.
- Periodicidade: `MENSAL`, `BIMESTRAL`, `TRIMESTRAL`, `SEMESTRAL`, `ANUAL`.
- Plano não é excluído: `active = false`.
- Pagamento de assinatura é dado do módulo subscriptions; o lançamento em financeiro é
  responsabilidade do módulo financial (reagindo ao evento/contrato).
- A assinatura preserva snapshot de nome, periodicidade, sessões por período e valor contratado.
- Não há exclusão física; status finais não reabrem. Um cliente não pode ter duas assinaturas ativas/inadimplentes do mesmo plano.
- `SubscriptionQueryService` é exportado para financial/dashboard; o módulo só depende de `ClientQueryService`.

---

## financial

**Responsabilidade:** receitas da clínica — origens, formas de pagamento, categorias e
indicadores de faturamento. **Não** decide se um atendimento existe nem se uma assinatura
está ativa: pergunta ao módulo dono.

**Entidades:** `FinancialTransaction`.

**Serviços públicos:**
- `FinancialTransactionService` — lançar receita/despesa, cancelar lançamento, garantir idempotência.
- `FinancialQueryService` — faturamento do mês, por período, por procedimento, por
  assinatura, quantidade de recebimentos.

**Eventos emitidos:** nenhum (por ora).

**Eventos consumidos:** `AppointmentCompleted`, `SubscriptionPaymentReceived`.

**Dependências permitidas:** contratos públicos de evento de `appointments` e `subscriptions`.
Não importa os módulos donos nem seus serviços/repositories.

**Endpoints:** `POST/GET /api/financial/transactions`, `PATCH /api/financial/transactions/:id/cancel`,
`GET /api/financial/summary` e `GET /api/financial/reports`.

**Regras principais:**
- `origin`: `APPOINTMENT`, `SUBSCRIPTION`, `MANUAL`.
- `paymentMethod`: `PIX`, `DINHEIRO`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `TRANSFERENCIA`, `OUTRO`.
- **Anti-duplicidade:** `appointmentId` e `subscriptionPaymentId` são únicos; o serviço
  recusa lançamento repetido para a mesma origem/referência.
- `externalReference` guarda referência externa livre (conciliação).
- Valores em centavos. Regra financeira nunca no frontend.
- Tipos `RECEITA`/`DESPESA`; status `PENDENTE`/`PAGO`/`CANCELADO`; cancelamento preserva o registro.
- Eventos dos módulos donos são consumidos por barramento genérico, sem acesso a repositories/tabelas internas.
- Snapshots `procedureName`/`subscriptionName` preservam relatórios históricos.

---

## protocols

**Responsabilidade:** fichas de protocolo clínico do cliente e suas sessões (histórico).

**Entidades:** `Protocol`, `ProtocolSession`.

**Serviços públicos:**
- `ProtocolService` — abrir ficha, editar dados administrativos, inativar.
- `ProtocolSessionService` — registrar sessão (somente acréscimo).
- `ProtocolQueryService` — fichas por cliente, histórico cronológico.

**Eventos:** emite nenhum; consome nenhum.

**Dependências permitidas:** `clients`, `procedures` e `appointments`, somente pelos respectivos serviços públicos de consulta.

**Endpoints:** `POST/GET /api/protocols`, `GET/PATCH /api/protocols/:id`,
`PATCH /api/protocols/:id/status`, `/inactivate`, `/reactivate`, `POST/GET /api/protocols/:id/sessions`
e `GET /api/clients/:id/protocols`.

**Regras principais:**
- **Nunca sobrescrever histórico clínico.** Sessão é acrescentada; correção gera novo
  registro ou anotação, nunca substituição silenciosa.
- Ficha inativa continua legível (soft delete via `active`/`deletedAt`).
- Ficha é impressa/exportada como visualização; o módulo não emite diagnóstico.
- Status: `EM_ANDAMENTO` → `CONCLUIDO` ou `CANCELADO`; estados finais não reabrem.
- Cliente/procedimento são validados por contratos públicos e têm nome em snapshot. Atendimento opcional
  precisa pertencer ao cliente, estar realizado e só pode aparecer uma vez no histórico.
- Só ficha ativa em andamento recebe edição administrativa e novas sessões; não há edição/exclusão de sessão.

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

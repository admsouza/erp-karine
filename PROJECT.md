# PROJECT.md — ERP Clínica

> **Fonte da verdade do projeto.** Antes de qualquer tarefa, leia este arquivo junto com
> `ARCHITECTURE.md`, `MODULES.md`, `TASKS.md` e `CHANGELOG.md`, rode `git status`, examine o
> módulo que será alterado e verifique os testes existentes. O repositório manda — a memória
> da conversa não.
>
> **Agente de IA continuando o projeto:** o ponto de entrada é o **`AGENTS.md`** (handoff com
> estado atual de produção, ritual branch → testes → PR → OK → deploy, infra, credenciais,
> armadilhas já pagas e próximos passos).

- **Repositório:** https://github.com/admsouza/erp-karine
- **App CapRover:** `erp-estetica` → https://erp-estetica.solucoes.cloud
- **Cliente:** clínica de estética
- **Estado atual:** Fases 1 a 7 concluídas: fundação, clientes, autenticação, procedimentos, agenda, assinaturas, financeiro (+ caixa, contas a receber/pagar e conciliação) e protocolos.
  Próxima: Fase 8 — módulo `exams`.

---

## 1. Objetivo

Sistema de gestão para uma clínica, nascendo **simples** mas com arquitetura que permite
crescimento contínuo sem quebrar o que já funciona. Módulos: clientes, procedimentos,
agendamentos, planos de assinatura, faturamento, protocolos de atendimento, recomendações
de exames e dashboard.

Prioridade técnica: **baixo acoplamento + alta coesão + separação clara de
responsabilidades**. Cada módulo evolui com o mínimo de impacto nos demais.

## 2. Stack

| Camada   | Tecnologias                                                            |
| -------- | ---------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Axios     |
| Backend  | NestJS 12, TypeScript, REST, Swagger (OpenAPI), class-validator         |
| Dados    | PostgreSQL + Prisma ORM 7 (driver adapter `pg`)                           |
| Testes   | Vitest                                                                  |

Segurança das dependências: `npm audit` retorna zero vulnerabilidades nos dois projetos.
NestJS permanece na linha 12 e Prisma na linha 7; correções transitivas temporárias estão
registradas em `ARCHITECTURE.md` (decisão 7.34).

Tecnologia só é substituída com necessidade real e decisão registrada em `ARCHITECTURE.md`.

## 3. Como executar

Requisito: Node.js 22 ou superior.

```bash
# Backend (API em 3001, docs em /api/docs)
cd backend
cp .env.example .env      # primeira vez
npm install               # o postinstall roda `prisma generate`
npm run db:migrate        # aplica as migrações no PostgreSQL de desenvolvimento
npm run start:dev

# Frontend (5173, com proxy de /api para o backend)
cd frontend
npm install
npm run dev
```

Produção (um único app: o backend serve o build do frontend):

```bash
cd frontend && npm run build
cd ../backend && npm run build && npm run start:prod
```

Scripts: backend `start:dev`, `build`, `test:e2e`, `db:migrate`, `db:generate`, `db:studio`,
`db:reset`, `lint`; frontend `dev`, `build`, `lint`.

### Primeiro acesso (autenticação)

O sistema exige login. O primeiro usuário é criado por CLI (não há tela de cadastro):

```bash
cd backend
node dist/scripts/create-user.js --email voce@clinica.com.br --password "SenhaForte123" --name "Seu Nome"
```

A senha informada é **temporária**: o sistema obriga a troca no primeiro acesso.
A sessão usa cookie `httpOnly` de 7 dias (ver `ARCHITECTURE.md`, seção 8.2).

## 4. Configuração

| Onde | Variável | Para quê |
| ---- | -------- | -------- |
| `backend/.env` | `DATABASE_URL` | conexão PostgreSQL (`postgresql://...`); em produção `srv-captain--postgresql:5432`, banco `erp_estetica` |
| `backend/.env` | `PORT` | porta da API (3001) |
| `backend/.env` | `CORS_ORIGINS` | origens liberadas em desenvolvimento |
| `backend/.env` | `FRONTEND_DIST` | caminho alternativo do build do SPA (opcional) |
| `frontend/.env` | `VITE_API_URL` | base da API (padrão `/api`) |

## 5. Funcionalidades existentes

- `GET /api/health` — status da API e do banco.
- `GET /api/docs` e `/api/docs-json` — documentação Swagger.
- Envelope de erro padronizado em toda a API, inclusive 404 de rota inexistente.
- Layout administrativo (menu lateral com os 7 módulos de operação + seção **Sistema**, barra superior
  com status da conexão, responsivo com gaveta no mobile) e páginas base de cada módulo com estado vazio.
- **Seção Sistema**: Auditoria, Usuários, **Manutenção de cadastros** (locais do recurso,
  **identificações sugeridas**, clientes, procedimentos, **produtos** e planos de assinatura) e
  Integração (todas ADMIN). O menu de operação passa a ter **9 itens** (entra **Produtos**).
- Build do frontend servido pelo backend quando `frontend/dist` existe.
- **Módulo `clients` implementado (Fase 2)**: CRUD sem exclusão física, busca paginada,
  inativação/reativação, CPF validado e único, Swagger completo, 6 testes unitários e
  e2e do fluxo inteiro. Frontend: lista com busca (debounce), filtro de situação, paginação,
  formulário em modal e página do cliente com as seções dos módulos futuros.
- Estrutura modular dos 8 domínios criada; `clients`, `procedures`, `appointments` e
  `subscriptions` já têm backend, frontend e testes completos. Os demais entram em suas fases.
- **Financeiro ampliado (Fase 6.1)**: além dos lançamentos e relatórios, a tela tem as abas
  **Caixa** (abertura mensal com transporte de saldos, movimentação por local, fechamento com saldo
  esperado/apurado/divergência), **Contas a receber**, **Contas a pagar** (vencimento, situação,
  baixa parcial/total) e **Conciliação** (confronto sistema × valores efetivos, com registro da
  divergência). Fechamento bloqueia edição; correção entra como ajuste auditado.

## 6. Regras de negócio

### Clientes
- Cliente não é excluído: inativação (`active = false`, `deactivatedAt`).
- CPF único quando informado. Busca por nome, CPF, telefone e WhatsApp.
- Página do cliente agrega dados de outros módulos **via serviço público**, sem duplicar
  regra de negócio.

### Procedimentos

Catálogo implementado (Fase 3): cadastro, edição, busca, filtro por situação e
duração aproximada; inativação sem excluir. É o catálogo referenciado por agenda,
protocolos e financeiro.

**Unidade de medida:** cada procedimento declara a base de cobrança (Sessão,
Aplicação, Região, ml, Unidade, Hora, Pacote/Combo) e o valor é exibido como
"R$ 900,00 / região". A unidade pode ser trocada a qualquer momento no cadastro.

**Valor unitário com vigência:** o preço não é um campo fixo — cada valor vale a
partir de uma data (`validFrom`) e o valor anterior é encerrado automaticamente
quando entra um novo. A tela do procedimento mostra o valor vigente e o histórico
completo, e a API permite consultar o valor que valia em qualquer data
(`/api/procedures/:id/price-on?date=`). Nada é reescrito: reajustes entram como
vigência nova, então relatórios e atendimentos antigos continuam com o preço da época.
- Nome, descrição, duração aproximada, valor padrão, ativo.
- Outros módulos referenciam por **id**; onde o dado precisa sobreviver a mudanças de
  cadastro, guarda-se *snapshot* (caso de `Appointment.procedureName`).

### Agendamentos
- Cliente, procedimento, profissional, data, horário, valor, observação.
- Status: `AGENDADO`, `CONFIRMADO`, `REALIZADO`, `CANCELADO`, `FALTOU`.
- Agenda diária, semanal, por período, por cliente e por status. Não se exclui: cancela.
- Snapshot de nome, unidade, quantidade, valor unitário e total preserva o valor contratado.
- Estados finais são imutáveis; agendado/confirmado podem cancelar ou registrar falta.

### Assinaturas
- Plano: nome, descrição, valor, periodicidade, quantidade de sessões, ativo.
- Assinatura: cliente, plano, início, fim, valor contratado, forma de pagamento, status
  (`ATIVA`, `CANCELADA`, `ENCERRADA`, `INADIMPLENTE`).
- Pagamentos da assinatura são registrados e podem gerar lançamento financeiro.
- Implementado: planos com inativação/reativação; contrato com snapshot de nome, periodicidade, sessões e valor do plano; ciclo de status e pagamentos com filtros.
- Uma assinatura ativa/inadimplente do mesmo plano por cliente; sem exclusão física.

### Financeiro
- `FinancialTransaction`: cliente, descrição, categoria, valor, data, forma de pagamento,
  origem (`APPOINTMENT`, `SUBSCRIPTION`, `MANUAL`), referência externa opcional e **local do recurso**
  (`resourceAccountId`).
- Formas: `PIX`, `DINHEIRO`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `TRANSFERENCIA`, `OUTRO`.
- **Impede lançamento duplicado** para o mesmo atendimento/pagamento (vínculos únicos).
- **Lançamento manual**: receita pergunta o **cliente** (vinculado ao cadastro); despesa pergunta o
  **credor** (texto, com sugestão dos já usados). O **procedimento** vinculado preenche o valor vigente
  (editável) e o nome fica em snapshot. **Desconto** por percentual ou em reais, com o valor cheio, o
  desconto e o **líquido** gravados. Ao salvar, o sistema **pergunta se já foi recebido/pago** — Sim
  grava `PAGO`, Não grava `PENDENTE`. `Categoria` saiu do formulário (o dado antigo permanece).
- **Somente ADMIN** pode alterar/cancelar lançamento financeiro existente (inclusive definir local ou criar ajuste); qualquer usuário autenticado continua podendo criar lançamento novo.
- Regra financeira vive no backend, nunca no frontend.
- Implementado: receitas e despesas manuais, geração automática idempotente por eventos,
  cancelamento lógico, filtros, indicadores e relatórios por snapshots históricos.
- `FinancialQueryService` é o contrato público para o dashboard.

#### Caixa
- Um caixa por mês (`CashPeriod`, `month` único). A abertura carrega **automaticamente** o saldo
  apurado de cada local do último período fechado — digitar saldo inicial é recusado.
- Locais do recurso (`ResourceAccount`): **espécie** (`CASH`), **banco** (`BANK`) e
  **conta de maquineta** (`CARD`), com cadastro próprio (mais de uma conta/maquineta é permitido).
- A **lista de identificações** oferecida no cadastro é um cadastro à parte
  (`ResourceAccountSuggestion`), mantido em **Sistema → Manutenção de cadastros**: a clínica inclui
  banco novo, renomeia e tira de linha sem depender de publicação. Nome próprio ("Outro (digitar)")
  continua disponível, então a lista **sugere**, não trava.
- O local pode ser **corrigido** (nome e tipo) a qualquer momento, com registro em auditoria — renomear
  não move valor, porque o saldo é ligado ao local e não ao nome.
- Local **não é excluído**: inativar tira o local das listas de novos lançamentos e de novas aberturas,
  preservando os meses já fechados. Não se inativa local com lançamento no mês aberto.
- **O saldo é um só**: o **saldo total do caixa é a soma de todos os locais**. O detalhe por local
  existe para a conferência física (gaveta, cada banco, cada maquineta), e a tela mostra o total
  consolidado (inicial, entradas, saídas, esperado, apurado e divergência) **acima** da composição
  por local. Do mesmo jeito que se somam as fontes de receita: a composição é por origem, o saldo é
  o consolidado.
- Movimentação por local; lançamento sem local é contabilizado em aberto e **impede o fechamento**.
- **Fechamento** mostra saldo inicial, entradas, saídas, **saldo esperado**, **saldo apurado** e
  **divergência** por local, com motivo.
- Depois de fechado, os lançamentos do período **não são editados nem cancelados**: correção entra como
  **ajuste** (lançamento novo vinculado, idempotente, com motivo) — tudo registrado na auditoria.

#### Contas a receber / Contas a pagar
- Vencimento, valor, descrição, contraparte e situação derivada: `PENDENTE`, `PARCIAL`, `PAGO`,
  `CANCELADO` (+ marca de vencido).
- **Recebimento/pagamento parcial ou total** com local do destino e forma de pagamento; cada baixa
  gera **um** lançamento financeiro e é idempotente (chave por baixa) — sem duplicidade.
- Sem exclusão física; cancelamento só para conta sem baixas.

#### Conciliação
- Confere, por período e por local, o **saldo do sistema** contra o **saldo efetivo** (gaveta, banco,
  maquineta) e **registra a divergência sem alterar lançamentos**.
- O registro é histórico (append-only), com motivo/referência e trilha de auditoria.

### Protocolos
- Cliente pode ter vários protocolos; cada um com várias sessões.
- **Histórico clínico nunca é sobrescrito**: sessões são acrescentadas em ordem cronológica.
- Implementado: ficha com status `EM_ANDAMENTO`, `CONCLUIDO` ou `CANCELADO`, inativação lógica,
  snapshots de cliente/procedimento e vínculo opcional de sessão com procedimento e atendimento realizado.
- Dados administrativos da ficha só mudam enquanto em andamento; sessões não têm endpoint de edição/exclusão.
- Frontend mobile-first com filtros, detalhe, criação/edição, registro de sessão e impressão.

### Recomendações de exames
- Recomendação com vários itens; status `RECOMENDADO`, `REALIZADO`, `CANCELADO`.
- **Só registra** a recomendação profissional: sem diagnóstico automático, sem interpretação
  de resultado. Visualização limpa, preparada para impressão/PDF.

### Produtos
- Catálogo de revenda, kit e cosmético para **venda ao cliente**, **compra de credor** ou ambos: nome, unidade, descrição, preço de venda, custo de compra e ativo. Valores simples — o lançamento guarda nome e valor efetivo, então o histórico não é reescrito.
- No lançamento manual o seletor mostra somente produtos compatíveis: venda para receita e compra para despesa; o respectivo valor sugerido é preenchido mas segue editável. Um lançamento aponta para procedimento **ou** produto.

### Manutenção de cadastros (Sistema)
- Hub para **corrigir** e **inativar/reativar** cadastros básicos: locais do recurso, clientes,
  procedimentos e planos de assinatura, com busca e filtro de situação.
- **Não cria, não exclui** e não tem regra própria: delega ao módulo dono, que valida. Inativar preserva
  o histórico (meses fechados do caixa, atendimentos antigos etc.).
- Campos editáveis são poucos de propósito (identificação + dado principal); o resto continua na tela do
  módulo. O valor unitário de procedimento **não** é editado aqui (tem vigência própria).

### Dashboard
- Apenas consulta e agregação: faturamento do mês, clientes cadastrados, atendimentos do
  dia, atendimentos do mês, assinaturas ativas, próximos atendimentos.
- Consulta os módulos donos dos dados; nenhuma regra de negócio própria.

### Dinheiro
- Sempre em **centavos (inteiro)** no banco, na API e no estado do frontend. Conversão para
  exibição apenas na borda da interface.

## 7. Entidades e relacionamentos

`Client`, `Procedure`, `Product`, `Appointment`, `SubscriptionPlan`, `ClientSubscription`,
`SubscriptionPayment`, `FinancialTransaction`, `ResourceAccount`, `CashPeriod`, `CashBalance`,
`FinancialTitle`, `FinancialSettlement`, `FinancialReconciliation`, `Protocol`, `ProtocolSession`,
`ExamRecommendation`, `ExamRecommendationItem`, `AuditEvent` — todas com UUID, `createdAt`,
`updatedAt` e soft delete conforme a entidade (`AuditEvent`, `FinancialSettlement` e
`FinancialReconciliation` são append-only). O dono de cada entidade
está em `MODULES.md`; o schema é `backend/prisma/schema.prisma`.

```
Client 1─N Appointment            Appointment N─1 Procedure (opcional)
Client 1─N ClientSubscription     ClientSubscription N─1 SubscriptionPlan
ClientSubscription 1─N SubscriptionPayment
Client 1─N FinancialTransaction   FinancialTransaction N─1 Appointment (opcional, único)
                                  FinancialTransaction N─1 SubscriptionPayment (opcional, único)
                                  FinancialTransaction N─1 ResourceAccount (local do recurso)
                                  FinancialTransaction 1─N FinancialTransaction (ajuste)
CashPeriod 1─N CashBalance        CashBalance N─1 ResourceAccount
CashPeriod 1─N FinancialReconciliation  FinancialReconciliation N─1 ResourceAccount
FinancialTitle 1─N FinancialSettlement  FinancialSettlement 1─1 FinancialTransaction (único)
Client 1─N Protocol               Protocol 1─N ProtocolSession
Client 1─N ExamRecommendation     ExamRecommendation 1─N ExamRecommendationItem
AuditEvent: trilha polimórfica (module/entityType/entityId), sem FK de domínio
```

## 8. Estrutura de pastas

```
erp-karine/
├── PROJECT.md  ARCHITECTURE.md  MODULES.md  TASKS.md  CHANGELOG.md  README.md
├── backend/src/{main.ts, app.module.ts, app.setup.ts, modules/, common/, generated/}
├── backend/{prisma/, prisma.config.ts, test/, .env.example}
└── frontend/src/{app/, features/, shared/, main.tsx, index.css}
```

Detalhamento das camadas e das regras de dependência: `ARCHITECTURE.md` (seção 2 e 3).

## 9. Funcionalidades pendentes

Ordem de execução em `TASKS.md`: Fase 2 `clients` → 3 `procedures` → 4 `appointments` →
5 `subscriptions` → 6 `financial` → 7 `protocols` → **transversal `audit` (trilha de alterações +
edição de pagamento com motivo e linha do tempo)** → 8 `exams` → 9 `dashboard` → 10 revisão
arquitetural, UX, validações, testes e documentação final.

Decisões ainda abertas: autorização por perfil/recuperação de senha e rotina de backup do banco
(`pg_dump` agendado). Deploy já configurado: imagem única no CapRover servindo API + SPA,
com migração aplicada no boot do container. Infra disponível e ainda não usada: Redis
(cache/sessão) e MinIO (fotos e fichas digitalizadas).

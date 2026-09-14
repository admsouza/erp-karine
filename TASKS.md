# TASKS.md — ERP Clínica

> **Agente que for continuar este projeto:** leia primeiro o `AGENTS.md` (handoff completo: ritual de
> trabalho, armadilhas já pagas, infra e próximos passos). Este arquivo é a lista de tarefas por fase.

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído.
**Somente uma funcionalidade importante em andamento por vez.** Concluir e testar uma fase
antes de começar a próxima.

---

## Fase 1 — Estrutura, arquitetura modular e documentação `[x]`

- [x] Monorepo `backend/` + `frontend/`, repositório git publicado
- [x] Backend NestJS 12 + TypeScript (ESM), Swagger, `ValidationPipe` global, erro padronizado
- [x] Frontend React 19 + TypeScript + Vite 8 + Tailwind 4 + React Router 7 + Axios
- [x] Prisma 7 + SQLite com driver adapter libSQL e migração `init` aplicada
- [x] Estrutura modular do backend: `modules/<dominio>/{controllers,services,dto,repositories,entities}`
- [x] `common/` com database, exceptions, health, pagination (+ pastas reservadas)
- [x] Estrutura modular do frontend: `app/`, `features/<dominio>/`, `shared/`
- [x] Schema inicial com 11 entidades e 6 enums (UUID, createdAt/updatedAt, soft delete)
- [x] Layout administrativo (menu lateral, barra superior, responsivo) + páginas base
- [x] `GET /api/health` + Swagger em `/api/docs`
- [x] Documentação persistente: `PROJECT.md`, `ARCHITECTURE.md`, `MODULES.md`, `TASKS.md`, `CHANGELOG.md`
- [x] Verificação: lint, typecheck, testes e2e (3/3) e build nos dois projetos

## Fase 2 — Módulo `clients` `[x]`

- [x] `ClientRepository` (único lugar com Prisma no módulo)
- [x] DTOs: `CreateClientDto`, `UpdateClientDto`, `ListClientsQueryDto` (busca + paginação)
- [x] `ClientService`: criar, editar, inativar, reativar (CPF único; sem delete físico)
- [x] `ClientQueryService`: buscar por id, listar/pesquisar, existência (contrato público)
- [x] `ClientsController` + Swagger de todos os endpoints
- [x] Unit tests do service (regras: CPF duplicado, inativação, reativação)
- [x] e2e do módulo: criar → listar → editar → inativar → filtrar inativos
- [x] Frontend `features/clients/`: `types`, `api`, lista com busca, formulário e página do cliente
- [x] Página do cliente com seções de outros módulos (vazias até suas fases)
- [x] Atualizar `MODULES.md` (contrato final), `TASKS.md`, `PROJECT.md` e `CHANGELOG.md`

## Fase 2.5 — Autenticação `[x]`

Antecipada antes da Fase 3 por decisão do cliente (havia dado de paciente em app público).

- [x] `User` + `Session` no schema Prisma (migração `auth_users_sessions`)
- [x] `AuthService` (login, logout, troca de senha, `me`) e `SessionService` (emitir/resolver/revogar)
- [x] `SessionAuthGuard` global + decorator `@Public()` (health e login)
- [x] `OriginGuard` (CSRF) e bloqueio por tentativas de login (429)
- [x] Cookie `httpOnly`/`SameSite=Lax`/`Secure`; token de sessão hasheado no banco
- [x] Documentação Swagger exigindo sessão
- [x] CLI `node dist/scripts/create-user.js` para criar o primeiro usuário
- [x] Frontend: `/login`, `/trocar-senha` (obrigatória com senha temporária) e menu do usuário na topbar
- [x] Testes: 8 unitários do `AuthService`, 9 e2e do módulo de auth (16 e2e no total na época)
- [x] Usuário de produção criado (`mkarineon@gmail.com`, perfil ADMIN) e bloqueio conferido em produção: `/api/clients` e `/api/docs-json` respondem 401 sem sessão
- [ ] Autorização por perfil completa (ADMIN/USER) — **parcialmente resolvida**: `RolesGuard` + `@Roles` existem e a tela de auditoria é ADMIN; falta decidir quais outros módulos são restritos. Recuperação de senha pelo sistema segue não implementada.

---

## Fase 3 — Módulo `procedures` `[x]`

- [x] CRUD + inativação (nome, descrição, duração, valor padrão, ativo) — migração não necessária (tabela já existia)
- [x] `ProcedureQueryService` exportado como contrato para appointments/financial/protocols
- [x] Frontend: `features/procedures/` (listagem com busca e filtro, formulário em modal, item novo no menu)
- [x] Testes: 7 unitários do `ProcedureService` e 5 e2e do módulo (23 e2e no total) + smoke HTTP e verificação da tela em navegador real
- [x] Bug real corrigido: `OriginGuard` recusava o login legítimo quando o proxy troca o `Host` (dev) — guard passou a aceitar `X-Forwarded-Host` e `CORS_ORIGINS`, com testes do caso positivo
- [x] Publicado em produção (`194758e`) e conferido em navegador real: menu com 8 itens e catálogo de procedimentos no ar
- [x] **Ajuste pós-publicação (pedido do cliente):** valor unitário passa a ter **vigência** (`ProcedurePrice`), com série histórica; campo único removido; migração com backfill validada contra cópia dos dados reais de produção (6 procedimentos, R$ 5.100,00 preservados); tela de histórico em `/procedimentos/:id`
- [x] **Segundo ajuste:** campo de **unidade de medida** (`ProcedureUnit`) e **correção da vigência atual** (`PATCH .../prices/:priceId`), para ajustar valor e unidade dos procedimentos já gravados; vigência encerrada continua imutável

## Fase 4 — Módulo `appointments` `[x]`

- [x] Entidade e repositório; dependências por serviço público (clients, procedures)
- [x] Transições de status (AGENDADO → CONFIRMADO → REALIZADO / CANCELADO / FALTOU)
- [x] Consultas: agenda diária, agenda semanal, por período, por cliente, por status
- [x] `AppointmentQueryService` (contrato para financial e dashboard)
- [x] Frontend: `features/appointments/` (agenda do dia/semana, filtros, formulário)
- [x] Testes do módulo, smoke HTTP e verificação por navegador real em produção

## Fase 5 — Módulo `subscriptions` `[x]`

- [x] Planos, assinaturas e pagamentos (repositórios + services por caso de uso)
- [x] Status, periodicidade, snapshot comercial e sem exclusão física
- [x] `SubscriptionQueryService` (contrato para financial e dashboard)
- [x] Frontend mobile-first com filtros, formulários e estados de tela
- [x] Unitários/e2e, smoke HTTP e navegador real

## Fase 6 — Módulo `financial` `[x]`

- [x] `FinancialTransactionService` com anti-duplicidade (appointmentId/subscriptionPaymentId únicos)
- [x] Geração de lançamento a partir de `AppointmentCompleted` e `SubscriptionPaymentReceived`
- [x] `FinancialQueryService`: faturamento, despesas, saldo e relatórios por procedimento/assinatura
- [x] Frontend mobile-first: indicadores, lançamentos, filtros, lançamento manual e estados de tela
- [x] Testes unitários/e2e, smoke HTTP, auditoria e verificação em navegador real

## Fase 6.1 — Financeiro: caixa, contas a receber/pagar e conciliação `[x]`

Submódulos pedidos pelo cliente dentro do `financial` (sem novo padrão, sem refatorar fora do escopo).
Invariantes cobertos por unitários **e** e2e, cada fatia implementada com teste vermelho antes do código.

- [x] Locais do recurso (`ResourceAccount`: `CASH`, `BANK`, `CARD`) como cadastro do módulo financeiro —
  substituem os campos fixos de espécie/banco/maquineta
- [x] **Identificação do local em lista única** (espécie, bancos pelo nome real, maquinetas e
  "Outro (digitar)"), com o tipo derivado da escolha
- [x] **Editar o local** (nome/tipo, com auditoria) e **inativar/reativar** sem exclusão física:
  inativo sai dos novos lançamentos e de novas aberturas, meses fechados preservados
- [x] Abertura mensal do caixa (`CashPeriod`) com **transporte automático** dos saldos apurados do último
  período fechado e **recusa de abertura duplicada** (409) e de período fora de sequência
- [x] Saldo inicial informado à mão é recusado (400): o transporte é a regra
- [x] Movimentação por local; lançamento sem local bloqueia o fechamento até ser classificado
  (`PATCH /api/financial/transactions/:id/resource`)
- [x] Fechamento com saldo inicial, entradas, saídas, saldo esperado, saldo apurado e divergência por local,
  com motivo obrigatório
- [x] Período fechado **não aceita edição nem cancelamento** de lançamento (409); ajuste só como lançamento
  novo vinculado (`adjustmentOfId` + chave de idempotência), rastreável na auditoria
- [x] Contas a receber e a pagar (`FinancialTitle`) com vencimento, valor, situação derivada
  (`PENDENTE`/`PARCIAL`/`PAGO`/`CANCELADO` + vencido), baixa **parcial ou total** e local de destino
- [x] Baixa gera **um** lançamento financeiro sem duplicidade (`transactionId` único) e é idempotente por chave
- [x] Conciliação registra divergência entre saldo esperado e saldo efetivo **sem alterar lançamentos**
  (`FinancialReconciliation`, append-only)
- [x] Propagação **transacional** de evento de domínio (`publish(evento, tx)`) — o lançamento financeiro do
  atendimento/assinatura entra na mesma transação do caso de uso dono
- [x] Migrações aditivas `20260913190000_cash_accounts`, `20260913191000_financial_titles` e
  `20260913192000_financial_reconciliation`
- [x] Frontend mobile-first na tela Financeiro: abas de Caixa, Contas a receber, Contas a pagar e Conciliação
- [x] Verificação em navegador real (390px e 1440px): abertura por 3 locais, movimentação, baixa
  parcial/total a receber, pagamento, conciliação com divergência, fechamento e **transporte para o mês
  seguinte**, sem erro de tela nem estouro horizontal

## Fase 7 — Módulo `protocols` `[x]`

- [x] Fichas + sessões (sessão somente por acréscimo — nunca sobrescrever)
- [x] Histórico cronológico e visualização para impressão
- [x] Frontend: `features/protocols/` com filtros, detalhes, formulários e estados de tela
- [x] Testes unitários/e2e, smoke HTTP e navegador real

## Transversal — Auditoria de alterações e edição de pagamentos `[x]`

Pedido do cliente antes da Fase 8: um pagamento lançado precisa poder ser corrigido, mostrando **quem**
alterou e uma **linha do tempo** dentro do próprio lançamento; e a trilha de auditoria precisa ser
organizada para o sistema inteiro (módulo transversal, não remendo na tela).

- [x] Módulo `audit` transversal: `AuditEvent` **append-only** + `AuditTrailService` como contrato público
- [x] Migração aditiva `20260913160000_audit_payment_history` (sem histórico retroativo: a trilha vale a partir daqui)
- [x] Edição completa do pagamento (`PATCH /subscriptions/:id/payments/:paymentId`) com **motivo obrigatório**, recusa de edição sem mudança efetiva e registro **apenas dos campos alterados**
- [x] Sincronização do lançamento financeiro vinculado na mesma transação, sem duplicar (`subscriptionPaymentId` continua único)
- [x] UI mobile-first: cada pagamento abre o detalhe com **Editar pagamento** e a linha do tempo (autor, data/hora de Recife, motivo e antes → depois com rótulos de negócio)
- [x] Testes: unitários do `AuditTrailService` e da edição + e2e do fluxo completo (motivo, mudanças, financeiro sincronizado, 401/400)
- [x] **Tela "Auditoria" no menu** (`/auditoria`), **exclusiva do ADMIN**: filtros por usuário, módulo, tipo de registro, ação, período e busca livre, com paginação e o antes → depois legível
- [x] **Autorização por perfil** finalmente implementada para esta área: `RolesGuard` global + `@Roles('ADMIN')`, falhando fechado (403); o item de menu é escondido para outros perfis
- [ ] Adoção gradual da trilha nos demais módulos (clientes, procedimentos, agenda, protocolos) — o padrão está definido; a adoção é incremental e não reescreve histórico passado

## Financeiro — Parte A: lançamento de venda/despesa `[x]`

Pedido do cliente na tela **Novo lançamento**: cliente na receita e credor na despesa, procedimento
vinculado, desconto (% ou R$), remoção de categoria e confirmação de pagamento ao salvar.

- [x] **Receita → cliente** (FK) e **despesa → credor** (texto com sugestão dos já usados); trocar os
  papéis devolve **400** e cliente/procedimento inexistente devolve **404**
- [x] **Procedimento vinculado** com snapshot do nome; a tela preenche o **valor vigente** (editável)
- [x] **Desconto** percentual ou em reais: grava tipo, valor informado, desconto efetivo e valor cheio —
  e mantém `amountCents` como **líquido**
- [x] **Categoria removida do formulário** (coluna e histórico preservados)
- [x] **Situação perguntada ao salvar** ("Já foi recebido/pago?" → Sim `PAGO` / Não `PENDENTE`)
- [x] Testes: 6 unitários novos + e2e das regras (papéis, desconto, sugestão de credores)
- [x] **Parte B — produtos:** catálogo de venda, compra ou ambos, com preço de venda/custo de compra; Financeiro filtra por tipo e mantém `productId` + snapshot no lançamento
- [x] **Administração financeira:** apenas `ADMIN` cancela, define local ou cria ajuste de lançamento existente; criação permanece para usuário autenticado
- [x] **Descrição** movida para último campo do Novo lançamento, após o resumo de valores
- [x] Produto disponível também na Manutenção de cadastros (editar valores/nome, inativar/reativar)
- [ ] Avaliar o desconto na composição dos relatórios (bruto − desconto = líquido) e o caso de
  **estorno/devolução para cliente** (hoje uma despesa não se vincula a cliente, por decisão 7.53)

## Transversal — Manutenção de cadastros `[x]`

Hub na seção **Sistema** para corrigir e inativar/reativar cadastros básicos sem caçar a tela de cada
módulo. Não tem tabela nem regra própria: consulta e delega aos módulos donos (decisão 7.49).

- [x] Módulo `maintenance` com `GET /api/maintenance/registrations` (tipo, busca, situação, paginação)
- [x] `PATCH .../:type/:id` (editar), `.../inactivate` e `.../reactivate`, todos `@Roles('ADMIN')`
- [x] Tipos cobertos: locais do recurso, clientes, procedimentos e planos de assinatura
- [x] Trilha de auditoria sem duplicar o evento do módulo dono
- [x] Tela mobile-first em `/sistema/manutencao` + item no menu da seção Sistema
- [x] `GET /api/maintenance/summary` com a contagem por tipo (o seletor mostra onde há cadastro)
- [x] Estado vazio acionável: "Cadastrar em …" quando o tipo está vazio e "Limpar filtros" quando é filtro
- [x] Testes: 8 unitários + e2e dedicado (6 casos) e verificação em navegador real
- [x] Identificação do local em **lista única** também na manutenção (com o tipo derivado; campo de tipo
  só no "Outro (digitar)") e catálogo compartilhado em `shared/data/locais-recurso.ts` (decisão 7.50)
- [x] `loading` derivado de token nas listas do hub (decisão 7.51) — corrige "Carregando…" preso quando a
  ação não muda filtro, e recarrega a lista após editar/inativar/reativar
- [x] **Dívida resolvida:** o hook `useUsers` (tela Usuários) recebeu a mesma correção — `loading` derivado
  do token de busca e cada ação (aplicar, limpar, trocar de página, recarregar) sobe o token. "Limpar"
  com filtros vazios e "Filtrar" repetido com o mesmo valor não travam mais em "Carregando…".
- [x] **Varredura do mesmo padrão:** os outros hooks com `setLoading(true)` no handler foram conferidos
  (`useProtocols`, `useAgenda`, `useFinancial`, `useProcedure`, `TitlesPanel`, `ReconciliationPanel`).
  Nenhum tem caminho alcançável com o **mesmo valor** — os filtros só disparam quando o valor muda
  (input/select), a paginação já é desabilitada durante o carregamento e os `reload` sobem token. Ficam
  registrados como candidatos à padronização quando forem tocados (decisão 7.51).
- [x] **Catálogo de identificações virou cadastro** (`ResourceAccountSuggestion`): migração com seed das
  9 identificações que estavam no frontend, CRUD na manutenção ("Nova identificação" + editar + inativar/
  reativar) e o seletor do Financeiro consumindo o catálogo pela API (decisão 7.52)
- [x] Unicidade de nome de local/identificação **sem diferenciar acentos** (`Itau` = `Itaú`)
- [ ] Novos cadastros entram sob demanda (ex.: procedimentos com valor — hoje o valor tem vigência
  própria e fica na tela do procedimento)

## Transversal — Seção `Sistema`: auditoria, usuários e integração `[~]`

O menu ganhou a seção **Sistema** (administração do próprio sistema, hoje toda de ADMIN). O módulo de
auditoria deixou de ser um item solto e passou a morar dentro dela.

- [x] Seção `Sistema` no menu, com os itens **Auditoria**, **Usuários** e **Integração** (`/sistema/*`)
- [x] Auditoria movida para `/sistema/auditoria` (com redirecionamento de `/auditoria`)
- [x] **Gestão de usuários** (`/sistema/usuarios`): listar com busca/perfil/situação, criar, trocar perfil, inativar/reativar e redefinir senha — com senha inicial sempre com troca obrigatória
- [x] Proteções: e-mail único, **não deixar o sistema sem administrador ativo**, o admin não se inativa nem se rebaixa, inativação/redefinição encerram as sessões, senha nunca vai para a trilha
- [x] Todas as alterações de usuário registradas na trilha de auditoria (`audit`)
- [x] **Integração**: tela preparada listando os pontos que já existem (auditoria, eventos de domínio, contratos públicos) e o que está em preparação — **sem agente de IA conectado ainda**
- [ ] **Políticas de acesso por usuário** (o que cada perfil pode ver/fazer além de ADMIN x USER) — decisão futura do cliente
- [ ] **Agente de IA na Integração** (credencial própria, escopo de leitura e ações auditadas) — fase futura

## Fase 8 — Módulo `exams` `[ ]`

- [ ] Recomendação com vários itens; status RECOMENDADO / REALIZADO / CANCELADO
- [ ] Visualização limpa preparada para PDF
- [ ] Frontend: `features/exams/`
- [ ] Testes do módulo

## Fase 9 — Módulo `dashboard` `[ ]`

- [ ] `DashboardService` agregando apenas via serviços públicos (sem regra de negócio)
- [ ] `GET /api/dashboard/summary`
- [ ] Frontend: substituir os "—" da tela inicial pelos números reais
- [ ] Teste de integração do endpoint

## Fase 10 — Revisão final `[~]` (contínua, conclui no fim)

- [ ] Revisão arquitetural (contratos entre módulos, sem violação de dependência)
- [ ] Revisão de UX (desktop, tablet, celular)
- [ ] Auditoria de validações, mensagens de erro e tratamento de falhas
- [ ] Cobertura de testes dos fluxos principais
- [ ] Documentação final revisada

---

## Infraestrutura / deploy (não bloqueia fases, mas precede o uso real)

- [x] `Dockerfile` multi-stage + `captain-definition` + `.dockerignore` para o app `erp-estetica`
- [x] `prisma migrate deploy` no entrypoint do container (fail fast se a migração falhar)
- [x] PostgreSQL no CapRover (`srv-captain--postgresql`, bancos `erp_estetica` e `erp_estetica_dev`)
- [x] Deploy publicado em https://erp-estetica.solucoes.cloud
- [ ] Rotina de backup do banco (`pg_dump` agendado) + teste de restauração
- [x] Autenticação por sessão e cookie httpOnly (Fase 2.5)
- [x] Auditoria de dependências: backend e frontend com `npm audit` em zero; runtime sem
      vulnerabilidades altas/críticas, mantendo NestJS 12 e Prisma 7
- [ ] Seed inicial (procedimentos e planos reais da clínica)

## Dívidas técnicas registradas

- [ ] `vitest.config.e2e.ts` usa `vite-tsconfig-paths`, que o Vite 8 já substitui por
      `resolve.tsconfigPaths` (apenas aviso; remover na Fase 10).
- [ ] `oxlint` do backend não exclui `src/generated` — hoje passa, mas convém restringir
      quando as regras ficarem mais rígidas.
- [ ] O volume persistente `erp-estetica-data` continua registrado no CapRover e **não é
      mais usado** (o banco saiu do container). Não é possível desativar `hasPersistentData`
      pela API; fica disponível para uploads futuros ou deve ser removido no painel.
- [ ] Redis e MinIO disponíveis no CapRover e não usados — registrar dependência só quando
      existir funcionalidade real.

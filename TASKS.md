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
- [ ] Autorização por perfil (ADMIN/USER) e recuperação de senha pelo sistema — não implementados

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
- [ ] Adoção gradual da trilha nos demais módulos (clientes, procedimentos, agenda, protocolos) — o padrão está definido; a adoção é incremental e não reescreve histórico passado

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

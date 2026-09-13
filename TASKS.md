# TASKS.md — ERP Clínica

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
- [x] Testes: 8 unitários do `AuthService`, 9 e2e do módulo de auth, 16 e2e no total
- [x] Usuário de produção criado (`mkarineon@gmail.com`, perfil ADMIN) e bloqueio conferido em produção: `/api/clients` e `/api/docs-json` respondem 401 sem sessão
- [ ] Autorização por perfil (ADMIN/USER) e recuperação de senha pelo sistema — não implementados

---

## Fase 3 — Módulo `procedures` `[ ]`

- [ ] CRUD + inativação (nome, descrição, duração, valor padrão, ativo)
- [ ] `ProcedureQueryService` como contrato para appointments/financial
- [ ] Frontend: `features/procedures/` (listagem + formulário)
- [ ] Testes do módulo

## Fase 4 — Módulo `appointments` `[ ]`

- [ ] Entidade e repositório; dependências por serviço público (clients, procedures)
- [ ] Transições de status (AGENDADO → CONFIRMADO → REALIZADO / CANCELADO / FALTOU)
- [ ] Consultas: agenda diária, agenda semanal, por período, por cliente, por status
- [ ] `AppointmentQueryService` (contrato para financial e dashboard)
- [ ] Frontend: `features/appointments/` (agenda do dia/semana, filtros, formulário)
- [ ] Testes do módulo

## Fase 5 — Módulo `subscriptions` `[ ]`

- [ ] Planos, assinaturas e pagamentos (repositórios + services por caso de uso)
- [ ] Status da assinatura e periodicidade
- [ ] `SubscriptionQueryService` (contrato para financial e dashboard)
- [ ] Frontend: `features/subscriptions/`
- [ ] Testes do módulo

## Fase 6 — Módulo `financial` `[ ]`

- [ ] `FinancialTransactionService` com anti-duplicidade (appointmentId/subscriptionPaymentId únicos)
- [ ] Geração de lançamento a partir de `AppointmentCompleted` e `SubscriptionPaymentReceived`
- [ ] `FinancialQueryService`: faturamento do mês, por período, por procedimento, por assinatura
- [ ] Frontend: `features/financial/` (lançamentos + indicadores)
- [ ] Testes do módulo

## Fase 7 — Módulo `protocols` `[ ]`

- [ ] Fichas + sessões (sessão somente por acréscimo — nunca sobrescrever)
- [ ] Histórico cronológico e visualização para impressão
- [ ] Frontend: `features/protocols/`
- [ ] Testes do módulo

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
- [ ] Autenticação de acesso (hoje o sistema é aberto) — decidir abordagem com o cliente
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

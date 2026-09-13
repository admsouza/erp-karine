# TASKS.md — ERP Clínica

Legenda: `[ ]` pendente · `[~]` em andamento · `[x]` concluído.
**Nunca iniciar várias funcionalidades grandes ao mesmo tempo.**

---

## Fase 1 — Estrutura do projeto `[x]`

- [x] Monorepo `backend/` + `frontend/` + `git init`
- [x] Backend NestJS 12 + TypeScript (ESM) + build validado
- [x] Frontend React 19 + TypeScript + Vite 8 + Tailwind 4 + React Router
- [x] Prisma 7 + SQLite: `prisma.config.ts`, schema inicial, migração `init` aplicada
- [x] 11 entidades + 6 enums (UUID, createdAt/updatedAt, soft delete)
- [x] Validação global (`ValidationPipe`) + filtro de erro padronizado + 404 de API
- [x] Swagger em `/api/docs`
- [x] `GET /api/health` (API + banco)
- [x] Layout administrativo (menu lateral, barra superior, responsivo)
- [x] Páginas base dos 7 módulos + 404 do frontend
- [x] Arquivos de continuidade: `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`, `CHANGELOG.md`
- [x] Testes e2e do backend (3 casos) passando
- [x] Backend e frontend executando e verificados por HTTP

## Fase 2 — Clientes `[ ]`  ← **próxima tarefa**

- [ ] Habilitar `ClientsModule` (controller + service + DTOs)
- [ ] `POST /api/clients` — criar cliente (validação de CPF único, e-mail, telefone)
- [ ] `GET /api/clients` — listar com busca por nome/CPF/telefone e filtro ativo/inativo
- [ ] `GET /api/clients/:id` — detalhe
- [ ] `PATCH /api/clients/:id` — editar
- [ ] `PATCH /api/clients/:id/inactivate` — inativar (sem delete físico)
- [ ] `PATCH /api/clients/:id/reactivate` — reativar
- [ ] Frontend: listagem com busca, formulário de cadastro/edição e página individual do cliente
- [ ] Página do cliente com abas/seções: dados, agendamentos, assinaturas, protocolos, exames,
      histórico financeiro (vazias até as fases correspondentes)
- [ ] Testes e2e do módulo de clientes + atualizar os 4 arquivos de continuidade

## Fase 3 — Procedimentos `[ ]`

- [ ] CRUD de procedimentos (nome, descrição, valor padrão, duração, ativo/inativo)
- [ ] Frontend: cadastro simples com listagem e inativação

## Fase 4 — Agendamentos `[ ]`

- [ ] CRUD de atendimentos (cliente, data/hora, procedimento, profissional, valor, observações)
- [ ] Transições de status (AGENDADO → CONFIRMADO → REALIZADO / CANCELADO / FALTOU)
- [ ] Agenda diária, agenda semanal, listagem por período, filtro por cliente e por status
- [ ] Frontend: calendário/lista do dia, formulário rápido, ações de status

## Fase 5 — Planos e assinaturas `[ ]`

- [ ] CRUD de planos (`SubscriptionPlan`)
- [ ] Assinatura do cliente (`ClientSubscription`) com status e vigência
- [ ] Registro de `SubscriptionPayment`
- [ ] Frontend: planos, assinaturas por cliente, pagamentos

## Fase 6 — Financeiro `[ ]`

- [ ] CRUD de `FinancialTransaction` (com origem ATENDIMENTO / ASSINATURA / MANUAL)
- [ ] Geração automática do lançamento a partir de atendimento e de pagamento de assinatura
- [ ] Trava anti-duplicidade no service (usar os vínculos `@unique`)
- [ ] Indicadores: faturamento do mês, por período, por procedimento, por assinatura,
      quantidade de recebimentos
- [ ] Frontend: lançamentos, filtros de período e painel financeiro

## Fase 7 — Protocolos `[ ]`

- [ ] CRUD de `Protocol` por cliente
- [ ] Sessões (`ProtocolSession`) por acréscimo, em ordem cronológica, sem sobrescrever
- [ ] Frontend: ficha de protocolo, timeline de sessões, impressão

## Fase 8 — Recomendações de exames `[ ]`

- [ ] CRUD de `ExamRecommendation` com vários `ExamRecommendationItem`
- [ ] Status RECOMENDADO / REALIZADO / CANCELADO
- [ ] Visualização limpa, preparada para impressão/PDF
- [ ] Nenhum diagnóstico automático — apenas registro profissional

## Fase 9 — Dashboard `[ ]`

- [ ] `GET /api/dashboard/summary`: faturamento do mês, clientes, agendamentos do dia,
      agendamentos do mês, assinaturas ativas, próximos atendimentos
- [ ] Frontend: substituir os valores "—" pelos números reais

## Fase 10 — Revisão final `[ ]`

- [ ] Revisão de UX (desktop, tablet, celular)
- [ ] Auditoria de validações e mensagens de erro
- [ ] Cobertura de testes dos fluxos principais
- [ ] Documentação final (README, PROJECT, ARCHITECTURE atualizados)

---

## Infra / deploy (não bloqueia as fases, mas precisa antes de ir ao ar)

- [ ] `Dockerfile` + `captain-definition` para o app CapRover `erp-estetica`
- [ ] Volume persistente do CapRover para o arquivo SQLite (`<app>-data`) + `prisma migrate deploy`
- [ ] Autenticação de acesso (hoje o sistema é aberto) — decidir abordagem com o usuário
- [ ] Definir seed inicial (procedimentos e planos reais da clínica)

## Pendências conhecidas / dívidas técnicas

- [ ] `vitest.config.e2e.ts` usa `vite-tsconfig-paths`, que o Vite 8 já substitui por
      `resolve.tsconfigPaths` (apenas aviso, sem impacto).
- [ ] `volumes: []` no CapRover apaga o SQLite em todo deploy — resolver junto com o Dockerfile.

# ARCHITECTURE.md — ERP Clínica

> Registro das decisões arquiteturais. **Antes de mudar qualquer coisa listada na seção 8,
> justifique neste arquivo.** Leia junto com `PROJECT.md`, `MODULES.md`, `TASKS.md` e
> `CHANGELOG.md`.

## 1. Arquitetura adotada

**Monólito modular** com duas aplicações e um banco:

```
frontend (SPA React)  ──HTTP/JSON──▶  backend (API REST NestJS, monólito modular)
                                              │
                                              ├─ módulos de domínio (clientes, agenda, ...)
                                              └─▶ PostgreSQL (srv-captain--postgresql, banco erp_estetica)
```

- **Monólito modular, não microserviços.** Cada domínio é um módulo independente dentro da
  mesma aplicação, com responsabilidade específica, regras encapsuladas, camada de serviço
  própria, DTOs próprios e contrato público explícito (`MODULES.md`).
- **Um único app no CapRover** (`erp-estetica`): o NestJS expõe `/api/*` e serve o
  `frontend/dist` no resto. Sem CORS em produção, um deploy só.
- **Em desenvolvimento**: Vite em `5173` e Nest em `3001`, com proxy de `/api` no Vite.
- **Sem autenticação na Fase 1** (uso interno). Pendência registrada em `PROJECT.md`.

## 2. Estrutura de diretórios

### Backend

```
backend/src/
├── main.ts                 # bootstrap (porta 3001)
├── app.setup.ts            # prefixo /api, ValidationPipe, filtro de erro, CORS, Swagger
├── app.module.ts           # composição dos módulos (NotFoundModule por último)
├── modules/                # um diretório por domínio
│   ├── clients/
│   │   ├── controllers/    # recebe requisição, valida entrada, delega e responde
│   │   ├── services/       # regra de negócio / casos de uso
│   │   ├── dto/            # contrato de entrada e saída (class-validator)
│   │   ├── repositories/   # persistência — o ÚNICO lugar com Prisma do módulo
│   │   ├── entities/       # tipos/mapeamentos do domínio
│   │   └── clients.module.ts
│   ├── procedures/  appointments/  subscriptions/  financial/  protocols/  exams/  dashboard/
├── common/                 # só o que é genérico (nada de regra de clínica)
│   ├── database/           # PrismaService + DatabaseModule (@Global)
│   ├── exceptions/         # filtro de erro padronizado + NotFoundModule da API
│   ├── health/             # GET /api/health
│   ├── pagination/         # PaginationQueryDto + envelope PaginatedResult
│   ├── guards/ interceptors/ decorators/ utils/   # pastas reservadas (criadas no 1º uso)
└── generated/prisma/       # cliente Prisma gerado (não versionado)
```

### Frontend

```
frontend/src/
├── main.tsx  index.css
├── app/
│   ├── App.tsx
│   ├── router/             # AppRouter (mapa de rotas) + NotFoundPage
│   ├── providers/          # AppProviders (BrowserRouter e futuros providers)
│   └── layout/             # AdminLayout, Sidebar, Topbar, navigation.ts
├── features/               # um diretório por domínio
│   ├── clients/{api,components,hooks,pages,types}
│   ├── procedures/ appointments/ subscriptions/ financial/ protocols/ exams/ dashboard/
│   └── ...                 # api/ = chamadas HTTP do módulo; types/ = tipos do módulo
└── shared/                 # só o que é realmente genérico
    ├── api/                # instância axios (http-client) + tradução de erro
    ├── components/         # Card, StatCard, PageHeader, Icons
    ├── hooks/              # useApiHealth
    ├── types/              # ApiError, HealthStatus, PaginatedResult
    └── utils/              # formatação (centavos→BRL, datas pt-BR)
```

## 3. Responsabilidade das camadas (backend)

| Camada | Faz | Não faz |
| ------ | --- | ------- |
| Controller | recebe requisição, valida entrada (DTO), chama o serviço, devolve resposta | regra de negócio |
| Service | regra de negócio, validação de domínio, orquestração | SQL/Prisma, formatação de resposta |
| Repository | persistência e consultas (Prisma) do próprio módulo | regra de negócio |
| DTO | contrato de entrada/saída com `class-validator`/`class-transformer` | regra de negócio |
| Entity | tipos do domínio e mapeamento | acesso a dados |

- Um serviço por caso de uso quando o caso de uso cresce (`CreateAppointmentService`,
  `CancelAppointmentService`...) — **evitar serviço gigante com dezenas de métodos**.
- Validação: frontend valida para dar feedback rápido, **backend valida sempre**
  (`ValidationPipe` global com `whitelist` + `forbidNonWhitelisted` + `transform`).
- Erros: filtro global único devolve `{ statusCode, error, message, path, timestamp }`.
  5xx nunca vaza detalhe interno.

### Regras de dependência entre módulos

**Proibido** um módulo acessar: repositório, implementação interna, controller ou arquivo
interno de outro módulo; ou executar Prisma sobre tabela de outro domínio.

**Permitido**: serviço público de consulta, contrato/interface, DTO público ou evento de
domínio.

```
ERRADO                               CERTO
FinancialService                     FinancialService
   └─▶ prisma.appointment.findMany      └─▶ AppointmentQueryService
       (tabela de outro módulo)              (dono dos dados)
```

- `DashboardModule` só agrega consultas via serviços públicos — nunca `SELECT` direto.
- Sem dependências circulares e sem dependência bidirecional. Se dois módulos precisam se
  conhecer, um deles reage a **evento** do outro.
- **Eventos de domínio** (quando ajudarem a desacoplar, não para tudo):
  `AppointmentCompleted` → financeiro lança receita; `SubscriptionPaymentReceived` →
  financeiro lança receita. Mapeados em `MODULES.md`.

## 4. Modelo de dados

11 entidades em `backend/prisma/schema.prisma`; o dono de cada uma está em `MODULES.md`.

Convenções obrigatórias:

- `id String @id @default(uuid())` em todas as entidades.
- `createdAt DateTime @default(now())` e `updatedAt DateTime @updatedAt`.
- Índices nas colunas de filtro recorrente (`clientId`, `date`/`scheduledAt`, `status`, `active`).
- **Dinheiro em centavos (`Int`)**: `valueCents`, `amountCents`, `priceCents`,
  `contractedValueCents`, `defaultValueCents`. O Postgres tem `numeric` exato, mas centavos
  em inteiro mantém uma única representação (exata, JSON-friendly) entre banco, API e
  frontend — JavaScript não tem tipo decimal nativo.
- **Enums são tipos nativos do Postgres** (valem `CHECK` de domínio no banco), mas a
  validação de entrada continua no DTO e no Prisma Client.
- Soft delete conforme a entidade: `active` (+ `deactivatedAt`) para cadastros que se
  inativam (Client, Procedure, SubscriptionPlan), `active`/`deletedAt` para Protocol,
  `status` para ciclos de vida (Appointment, ClientSubscription, ExamRecommendation).
  Exclusão física só para dado descartável (`ExamRecommendationItem` em cascata com a
  recomendação).
- Um único banco PostgreSQL, **mas cada módulo responde pelas suas entidades** — nenhum
  módulo consulta tabela de outro.

## 5. Convenções do frontend

- Nada de regra de negócio em React: componente exibe, chama `features/<x>/api` e trata
  estados (carregando/erro/vazio). Regra financeira **nunca** no componente.
- Componente específico mora na feature (`features/clients/components/ClientForm`);
  só entra em `shared/components` o que é genérico (Button, Modal, Input, Select, Table,
  Pagination, Card...).
- **Proibido** uma feature importar detalhes internos de outra feature
  (`features/financial → features/appointments/components/AppointmentForm`). Se dois
  módulos precisam do mesmo dado, o contrato é da API; se precisam do mesmo visual, o
  componente vai para `shared` sem conhecer regra de nenhum domínio.
- Status são **const objects + union types** (o tsconfig usa `erasableSyntaxOnly`, que
  proíbe `enum` do TypeScript) e espelham os enums do Prisma, cada um em
  `features/<modulo>/types`.
- Interface sóbria: paleta `slate` + `brand`, sem biblioteca de UI, ícones SVG inline,
  desktop primeiro com boa usabilidade em tablet/celular (menu em gaveta).

## 6. Testes e verificação

- Testes de regra de negócio prioritários: unitários de service, integração do módulo e
  testes das principais APIs (`test/*.e2e-spec.ts`).
- Cada módulo deve ser testável de forma relativamente isolada (sem subir o app inteiro).
- Antes de concluir uma funcionalidade: **lint, typecheck, test e build devem passar**.
- Baseline atual: `npm run lint`, `npx tsc --noEmit` (backend), `npm run build` (backend e
  frontend), `npm run test:e2e` (3 casos em `backend/test/app.e2e-spec.ts`).

## 7. Decisões técnicas (com o porquê)

| # | Decisão | Justificativa |
| - | ------- | ------------- |
| 7.1 | Monorepo com dois `package.json`, sem workspaces/nx/turbo | Dois projetos, dois comandos. Ferramenta extra não se paga aqui. |
| 7.2 | Backend em **ESM** (`"type": "module"`), imports relativos com extensão `.js` | Padrão do NestJS 12. Omitir o `.js` quebra o runtime. |
| 7.3 | Prisma 7: URL do banco em `prisma.config.ts` (não no `schema.prisma`) | Mudança do Prisma 7; o schema tem só `provider = "sqlite"`. |
| 7.4 | Generator `prisma-client` gerando em `src/generated/prisma` (não versionado) | O cliente é TS e precisa ser compilado junto com a app; `npm run db:generate` (e o `postinstall`) recria. |
| 7.5 | Banco **PostgreSQL** com driver adapter `@prisma/adapter-pg` (node-postgres) | Decisão do cliente em 2026-09-13: trocar SQLite por PostgreSQL. O `pg` é JS puro (sem binário nativo), então também elimina o problema de versão de Node que motivou o adapter libSQL anterior. Antes de haver dado real, a troca custou uma migração `init` nova. |
| 7.6 | `NotFoundModule` importado **por último** no `app.module.ts` | A ordem de resolução dos módulos define a ordem das rotas; o curinga `@All('*path')` importado antes engole rotas reais. |
| 7.7 | `ServeStaticModule` registrado **condicionalmente** (só se `frontend/dist` existir) | Em desenvolvimento o build pode não existir e o backend precisa subir mesmo assim. `FRONTEND_DIST` permite outro caminho. |
| 7.8 | Filtro de erro único (`@Catch()`) em vez de um filtro por tipo | Um só lugar formatando erro, nenhuma exceção escapa do envelope. |
| 7.9 | Testes com **Vitest** (não Jest) | É o que o scaffold do NestJS 12 traz; trocar seria custo sem ganho. |
| 7.10 | Tailwind 4 **CSS-first** (`@import 'tailwindcss'` + plugin do Vite) | Tailwind 4 não usa mais `tailwind.config.js`; tema em `@theme` no `index.css`. |
| 7.11 | `configureApp()` compartilhado entre `main.ts` e os testes e2e | Os testes exercitam a mesma stack de produção (prefixo, pipe, filtro). |
| 7.12 | `modules/<dominio>/{controllers,services,dto,repositories,entities}` | Estrutura de camadas pedida para o monólito modular: cada módulo encapsula sua regra e seu acesso a dados. |
| 7.13 | Pastas vazias reservadas (`.gitkeep`) em `common/guards`, `interceptors`, `decorators`, `utils` e nas features ainda não usadas | O layout existe desde a Fase 1; o conteúdo entra no primeiro uso real, sem scaffolding morto de código. |
| 7.14 | Uma migração `init` única, recriada na Fase 1 após realinhamento do schema | Ainda não existe dado real; recriar é mais limpo que empilhar migração de renomeação. |
| 7.15 | Imagem única multi-stage (frontend build → backend build → runtime) com o Nest servindo o SPA | Um container, um deploy, sem CORS e sem dois apps para manter sincronizados. |
| 7.16 | Banco **fora do container** (`srv-captain--postgresql`), sem volume de dados na imagem | O dado é do serviço de banco, não do app: deploy/restart não apaga nada e a capacidade de backup é a do Postgres (`pg_dump`). O diretório persistente `erp-estetica-data` continua registrado no CapRover, hoje sem uso. |
| 7.17 | `prisma migrate deploy` no entrypoint, com o CLI do Prisma em `dependencies` (não em devDependencies) | O container precisa aplicar migração no boot; deixar o CLI só em dev quebraria o start em produção. |
| 7.18 | `containerHttpPort = 3001` no CapRover (a API escuta 3001, não 80) | Evita depender de porta privilegiada dentro do container. |
| 7.19 | Cookie httpOnly não é acessível ao JavaScript (imune a roubo de token por XSS); a sessão pode ser revogada no servidor na hora (logout, troca de senha) — o que JWT stateless não permite sem lista de revogação. Sem Redis porque uma dependência a mais não se paga com uma clínica. |
| 7.20 | `bcrypt` nativo é compilado por `NODE_MODULE_VERSION` e quebra entre as duas versões de Node desta máquina (mesmo motivo do adapter libSQL). |
| 7.21 | O padrão seguro vira o default: esquecer o guard protege, esquecer o `@Public` só bloqueia. |
| 7.22 | Defesa de CSRF sem token em storage: o navegador sempre manda `Origin` em requisição não-GET, e requisição sem `Origin` (curl, teste) só passa porque não é navegador. |
| 7.23 | A senha inicial é combinada por fora do sistema (chat); obrigar a troca elimina o risco de credencial compartilhada circular para sempre. |
| 7.24 | O `SwaggerModule` registra handlers direto no Express e não passa pelo pipeline de guards do Nest; o middleware é registrado **antes** do Swagger porque no Express quem casa primeiro é quem foi registrado primeiro. |
| 7.25 | Preço de procedimento com **vigência** (`ProcedurePrice`), não campo único | Valores mudam com o tempo e o histórico precisa sobreviver: o valor único (`defaultValueCents`) foi **removido** em favor da série de vigências, e o que a API devolve como valor vigente é derivado (`currentValueCents`). Duas fontes de verdade (campo + histórico) divergiriam no primeiro reajuste. |
| 7.26 | Vigências não se sobrepõem e o passado não é reescrito | Novo valor fecha a vigência anterior no dia em que começa; vigência só entra depois da mais recente (409). Correção se faz removendo a vigência (a anterior volta a valer) — assim a série histórica permanece auditável. |
| 7.27 | Consulta de valor por data (`valueOn`) e data "pura" no fuso da clínica | O financeiro precisa do valor **que valia no dia do atendimento**, não do valor de hoje. Como as colunas são `DATE`, o "hoje" é calculado em `America/Recife` (UTC-3), senão a virada do dia cairia às 21h e uma vigência de hoje começaria "amanhã". |
| 7.28 | Unidade de medida como **enum fixo** (`ProcedureUnit`) no procedimento | O valor unitário só faz sentido com a base de cobrança ("por região", "por ml"). Enum em vez de texto livre porque o financeiro vai multiplicar quantidade × valor unitário: texto livre viraria "região", "Região" e "regioes" em relatórios. Ampliar a lista depois é uma migração pequena. |
| 7.29 | Só a vigência **em aberto** é editável; encerrada nunca | A vigência encerrada representa o preço praticado em um período — reescrever isso destrói a conferência do que foi cobrado. Corrigir o valor de hoje se faz pela vigência atual; mudar o preço daqui pra frente, por vigência nova. |
| 7.30 | Agendamento guarda snapshot comercial (`procedureName`, `procedureUnit`, `quantity`, `unitValueCents`, `valueCents`) | Alterações posteriores no catálogo não podem recalcular atendimento histórico; clientes e procedimentos são acessados só pelos serviços públicos dos donos. |
| 7.31 | Ciclo do agendamento é uma máquina de estados explícita e estados finais são imutáveis | Impede realizar atendimento cancelado ou reabrir falta; cancelamento substitui exclusão física. |
| 7.32 | Assinatura guarda snapshot comercial do plano | Nome, periodicidade, sessões por período e valor contratado não mudam quando o plano é alterado; pagamentos guardam valor, data e forma praticados. |
| 7.33 | Uma assinatura ativa ou inadimplente por cliente/plano | Evita contratos concorrentes duplicados; encerrada/cancelada preserva histórico e permite nova contratação. |
| 7.34 | Overrides transitivos mínimos para `multer@2.3.0`, `deepmerge-ts@8.0.2` e `mysql2@3.24.4` | Em 2026-09-13, as versões estáveis de NestJS 12.0.1 e Prisma 7.10.0 ainda fixavam releases vulneráveis (`multer@2.2.0`, `deepmerge-ts@7.1.5`, `mysql2@3.15.3`). O downgrade automático para NestJS 7/Prisma 6 foi rejeitado por quebrar a arquitetura sem eliminar a causa. Os overrides mantêm as APIs diretas, são compatíveis com Node >=22 e foram validados por geração do Prisma, 42 unitários, 45 e2e, typecheck, lint, builds e smoke HTTP. `@nestjs/mau` foi removido por ser tooling não utilizado e trazer `tmp`/`undici` vulneráveis. A imagem fixa npm 12.0.2 nos três estágios para interpretar de forma consistente o lockfile gerado por npm 12; npm 10 da imagem-base rejeita o peer opcional de TypeScript registrado no lock novo. Reavaliar e remover cada override quando o pacote proprietário incorporar a versão corrigida. |
| 7.35 | Eventos de domínio síncronos por barramento genérico em memória | Appointments e subscriptions publicam contratos públicos após persistir seus fatos; financial reage de forma idempotente, sem dependência reversa nem acesso às tabelas dos módulos donos. Chaves únicas protegem concorrência. Ao escalar além de uma instância, substituir o transporte por outbox preservando os contratos. |
| 7.36 | Financeiro guarda tipo, status e snapshots da origem | `RECEITA`/`DESPESA`, `PENDENTE`/`PAGO`/`CANCELADO` e nomes históricos permitem saldo, cancelamento lógico e relatórios sem recalcular cadastros atuais. |
| 7.37 | Sessões de protocolo são append-only e podem vincular um atendimento realizado uma única vez | Preserva a trilha clínica; correções entram como nova evolução, e o índice único de `appointmentId` evita duplicidade. A ficha guarda snapshots de cliente/procedimento e só usa contratos públicos dos módulos donos. |
| 7.38 | Auditoria é **módulo transversal** (`audit`) com evento **append-only**, acionado explicitamente pelo caso de uso | Um interceptor genérico de `PATCH` registraria ruído técnico, perderia o significado de negócio e poderia gravar dado sensível. Com `AuditTrailService` o módulo dono decide o que registrar (campos alterados, motivo e autor), e o histórico não tem rota de edição ou exclusão. A adoção é incremental e **não** cria histórico retroativo: a trilha começa na migração `20260913160000_audit_payment_history`. |
| 7.39 | Correção de pagamento de assinatura entra na **mesma transação** que a sincronização do lançamento financeiro | Editar o pagamento e deixar o financeiro divergente (ou duplicado) seria pior que não permitir editar. `SubscriptionPaymentService` usa o contrato público `FinancialTransactionService.synchronizeSubscriptionPayment(payload, tx)`; `subscriptionPaymentId` continua `@unique`, então a sincronização atualiza o lançamento existente em vez de criar outro. O `reason` é obrigatório e edição sem mudança efetiva é recusada (400), para a trilha não virar carimbo. |
| 7.40 | Autorização por perfil com `RolesGuard` + `@Roles(...)`, **opcional por rota** | Até aqui qualquer sessão válida tinha acesso total. Em vez de trocar o guard global por uma política rígida (que quebraria módulos já publicados), o `RolesGuard` é global e **só age em rota marcada**: sem `@Roles`, o comportamento anterior permanece. A trilha de auditoria é o primeiro uso (`@Roles('ADMIN')`) e falha fechado (403) se o perfil não bater ou não houver usuário. A adoção nos outros módulos é incremental e cada uma é uma decisão de negócio. |
| 7.41 | A tela de auditoria só mostra **opções de filtro que existem** e aceita filtro de data em dia inteiro de `America/Recife` | `GET /api/audit/filters` devolve autores/módulos/tipos/ações já registrados (nada de lista fixa que envelhece), e `from`/`to` são interpretados como 00:00 e 23:59:59 em UTC-3 — sem isso um evento das 23h de Recife cairia no dia seguinte e a conferência do cliente erraria. |
| 7.42 | Administração de usuários **dentro do módulo `auth`**, com proteção do último administrador e sem exclusão física | `User` pertence ao `auth`; criar um módulo `users` faria dois módulos escreverem na mesma tabela (proibido pela regra de dependência). Regras de segurança: e-mail único, senha sempre hasheada (custo 10), **nunca registrar a senha na trilha**, inativação e redefinição de senha **encerram as sessões abertas**, e o sistema **não pode ficar sem administrador ativo** (nem o próprio admin pode se inativar ou se rebaixar). Toda alteração vira evento em `audit`. |
| 7.43 | Menu com **seções** ("Sistema") em vez de lista plana | Auditoria, Usuários e Integração são administração do próprio sistema, não operação da clínica: agrupá-las mantém o menu principal curto e deixa claro onde entram as políticas de acesso e o agente de IA. Os itens de seção declaram `roles` e o backend aplica o mesmo corte (`@Roles('ADMIN')`) — esconder no frontend **não** é a barreira. |

## 8. Decisões que NÃO devem ser alteradas sem justificativa registrada aqui

1. **Dinheiro em centavos (`Int`).** Manter uma única representação exata e JSON-friendly
   entre banco, API e frontend (JS não tem decimal nativo); `Float` está fora de questão.
2. **UUID como chave primária** em todas as entidades.
3. **Não apagar histórico clínico e financeiro.** Cliente se inativa; sessão de protocolo é
   acrescentada, nunca sobrescrita.
4. **Anti-duplicidade de faturamento no banco**: `FinancialTransaction.appointmentId` e
   `subscriptionPaymentId` são `@unique`.
5. **Validação de entrada no backend** obrigatória em todo endpoint de escrita.
6. **PostgreSQL + driver adapter `@prisma/adapter-pg`** (ver 7.5). Trocar de banco de novo é
   decisão registrada, não detalhe de implementação.
7. **Validação de domínio no DTO** (`@IsEnum`), mesmo com enum nativo no banco — o banco não
   deve ser a única barreira contra payload inválido.
8. **Serviço único no CapRover** (backend servindo o SPA). Dois apps exigiriam CORS, cookie
   compartilhado e nova decisão aqui.
9. **Módulo não acessa dados de outro módulo** (seção 3). Toda exceção é dívida arquitetural
   e precisa de decisão registrada.
10. **`NotFoundModule` por último** no `app.module.ts` (ver 7.6).
11. **Overrides de segurança transitivos** são temporários e rastreados (ver 7.34); não aceitar
    downgrade major sugerido pelo `npm audit fix --force` sem análise de compatibilidade.

## 8.1 Deploy (CapRover)

- **App:** `erp-estetica` em `https://erp-estetica.solucoes.cloud` (app único).
- **Imagem:** `Dockerfile` multi-stage. O estágio de runtime roda como usuário `node`
  (não-root), com `tini` como PID 1, `HEALTHCHECK` batendo em `/api/health` e `EXPOSE 3001`.
- **Volume:** `/app/data` → volume CapRover `erp-estetica-data`. O arquivo SQLite é
  `file:/app/data/erp.db` (definido em `DATABASE_URL` na app definition **e** como padrão na
  imagem). Deploy não apaga mais o banco.
- **Migração:** `backend/docker-entrypoint.sh` roda `npx prisma migrate deploy` antes de
  subir a API. Se a migração falhar, o container não sobe (fail fast) em vez de servir um
  schema desatualizado.
- **Config do CapRover:** `containerHttpPort=3001`, `forceSsl=true`, `instanceCount=1`,
  `hasPersistentData=true` + volume registrado. Sem volume registrado, `hasPersistentData`
  sozinho não persiste nada.
- **Empacotamento:** tar com `Dockerfile`, `captain-definition`, `.dockerignore`, `backend/`
  e `frontend/`, excluindo `node_modules`, `dist`, `src/generated`, `*.db`, `.env`.
  As dependências são instaladas dentro do build (`npm ci`), nunca enviadas do host.
- **Pré-requisito de release:** `npm ci` precisa aceitar os `package-lock.json` (o build usa
  `npm ci`, que falha se o lock estiver fora de sincronia com o `package.json`).

## 8.2 Segurança (autenticação e sessão)

- **Modelo:** sessão com estado no Postgres. O cliente guarda apenas um cookie
  `httpOnly` (`erp_session`); o banco guarda o **hash sha256** do token, nunca o
  token. Sessão de 7 dias, renovada a cada requisição autenticada.
- **Padrão fechado:** o `SessionAuthGuard` é global; só o que está marcado com
  `@Public()` passa sem sessão (`GET /api/health` e `POST /api/auth/login`).
  Rota inexistente sob `/api` responde 401 sem sessão — não vaza quais rotas existem.
- **CSRF:** cookie `SameSite=Lax` + `OriginGuard` (403 quando o `Origin` de uma
  requisição de escrita não é o mesmo host da API).
- **Força bruta:** 5 falhas por par (IP, e-mail) bloqueiam 15 minutos (429).
  O contador é em memória — com uma instância é suficiente; ao escalar, mover para
  o banco/Redis e registrar a decisão.
- **Senhas:** bcrypt custo 10; mínimo 8 caracteres com letras e números; não pode
  ser igual ao e-mail; troca exige a senha atual e revoga as outras sessões.
- **Swagger:** exige sessão (ver 7.22).
- **Acesso inicial:** não há tela de cadastro. O primeiro usuário é criado por CLI
  (`node dist/scripts/create-user.js`), com senha temporária e troca obrigatória.
- **Ainda em aberto:** perfis (ADMIN/USER) já existem no modelo mas **não há
  autorização por perfil** — todo usuário logado tem acesso total; e não há
  recuperação de senha por e-mail (reset é feito pela CLI).

## 9. Ambiente e execução

- Node ≥ 22. **Atenção:** esta máquina tem duas versões de Node (22 em
  `/opt/data/home/.local/bin/node`, usada pelo shell interativo; 26 em
  `/usr/local/bin/node`, usada por processos em background). Como o `pg` é JS puro, o
  `node_modules` funciona nas duas sem rebuild.
- Portas: backend `3001`, frontend `5173` (proxy `/api`).
- Variáveis: `backend/.env` (`DATABASE_URL`, `PORT`, `CORS_ORIGINS`, `FRONTEND_DIST`
  opcional) e `frontend/.env` (`VITE_API_URL`, padrão `/api`).
- **Banco:** PostgreSQL em `srv-captain--postgresql:5432` (mesma rede overlay do CapRover).
  Bancos: `erp_estetica` (produção) e `erp_estetica_dev` (desenvolvimento e testes e2e).
  Credencial fica em `backend/.env` (não versionado) e na env var do app no CapRover.
- **Redis:** `srv-captain--redis:6379` está disponível no CapRover e **não é usado** — o
  sistema não tem cache nem sessão nesta fase. Dependência só entra quando existir uso real.
- **MinIO / S3:** `https://storage-api.solucoes.cloud` (console em
  `https://storage.solucoes.cloud`, região `eu-east-1`) está disponível para fotos clínicas e
  fichas digitalizadas — módulo futuro. **Não há dependência de S3 no projeto hoje.**
  As credenciais ficam apenas em `backend/.env` e nas env vars do CapRover, nunca no
  repositório. **Recomendação para quando o módulo existir:** criar um bucket dedicado
  (`erp-estetica`) com um usuário/access key próprio, em vez de usar a credencial root —
  e URLs assinadas de curta duração para exibir imagem de paciente.

## 10. Princípios de trabalho

SRP, OCP, inversão de dependência, separação de responsabilidades, DRY, KISS, YAGNI.
Em especial **Open/Closed**: adicionar um módulo novo deve exigir principalmente código
novo, não alteração extensa em módulos estáveis. Ao mexer em módulo existente: entender a
responsabilidade, identificar contratos e consumidores, avaliar impacto, criar teste e
fazer a **mudança mínima**. Nada de refatoração grande junto com funcionalidade não
relacionada.

Evitar explicitamente: God Service, God Component, arquivo de milhares de linhas, regra de
negócio em React, regra financeira em componente, Prisma espalhado, importação circular,
dependência bidirecional, código duplicado, `utils.ts` com dezenas de responsabilidades.

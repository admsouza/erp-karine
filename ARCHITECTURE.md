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
                                              └─▶ SQLite (arquivo, um único banco)
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
  `contractedValueCents`, `defaultValueCents`.
- Soft delete conforme a entidade: `active` (+ `deactivatedAt`) para cadastros que se
  inativam (Client, Procedure, SubscriptionPlan), `active`/`deletedAt` para Protocol,
  `status` para ciclos de vida (Appointment, ClientSubscription, ExamRecommendation).
  Exclusão física só para dado descartável (`ExamRecommendationItem` em cascata com a
  recomendação).
- Um único banco SQLite, **mas cada módulo responde pelas suas entidades** — nenhum módulo
  consulta tabela de outro.

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
| 7.5 | Driver adapter **libSQL** (`@prisma/adapter-libsql`) em vez de `better-sqlite3` | libSQL usa binário **N-API**: o mesmo `node_modules` roda em qualquer versão de Node. `better-sqlite3` é compilado por `NODE_MODULE_VERSION` e quebra com `ERR_DLOPEN_FAILED` quando o runtime muda (esta máquina tem Node 22 e 26). |
| 7.6 | `NotFoundModule` importado **por último** no `app.module.ts` | A ordem de resolução dos módulos define a ordem das rotas; o curinga `@All('*path')` importado antes engole rotas reais. |
| 7.7 | `ServeStaticModule` registrado **condicionalmente** (só se `frontend/dist` existir) | Em desenvolvimento o build pode não existir e o backend precisa subir mesmo assim. `FRONTEND_DIST` permite outro caminho. |
| 7.8 | Filtro de erro único (`@Catch()`) em vez de um filtro por tipo | Um só lugar formatando erro, nenhuma exceção escapa do envelope. |
| 7.9 | Testes com **Vitest** (não Jest) | É o que o scaffold do NestJS 12 traz; trocar seria custo sem ganho. |
| 7.10 | Tailwind 4 **CSS-first** (`@import 'tailwindcss'` + plugin do Vite) | Tailwind 4 não usa mais `tailwind.config.js`; tema em `@theme` no `index.css`. |
| 7.11 | `configureApp()` compartilhado entre `main.ts` e os testes e2e | Os testes exercitam a mesma stack de produção (prefixo, pipe, filtro). |
| 7.12 | `modules/<dominio>/{controllers,services,dto,repositories,entities}` | Estrutura de camadas pedida para o monólito modular: cada módulo encapsula sua regra e seu acesso a dados. |
| 7.13 | Pastas vazias reservadas (`.gitkeep`) em `common/guards`, `interceptors`, `decorators`, `utils` e nas features ainda não usadas | O layout existe desde a Fase 1; o conteúdo entra no primeiro uso real, sem scaffolding morto de código. |
| 7.14 | Uma migração `init` única, recriada na Fase 1 após realinhamento do schema | Ainda não existe dado real; recriar é mais limpo que empilhar migração de renomeação. |

## 8. Decisões que NÃO devem ser alteradas sem justificativa registrada aqui

1. **Dinheiro em centavos (`Int`).** `Float`/`Decimal` reintroduzem erro de arredondamento; o
   SQLite não tem decimal exato (`Decimal` do Prisma cai em `NUMERIC`).
2. **UUID como chave primária** em todas as entidades.
3. **Não apagar histórico clínico e financeiro.** Cliente se inativa; sessão de protocolo é
   acrescentada, nunca sobrescrita.
4. **Anti-duplicidade de faturamento no banco**: `FinancialTransaction.appointmentId` e
   `subscriptionPaymentId` são `@unique`.
5. **Validação de entrada no backend** obrigatória em todo endpoint de escrita.
6. **Driver adapter libSQL** (ver 7.5).
7. **Enums viram `TEXT` no SQLite** — o banco não valida o domínio do status. A validação
   real é o DTO (`@IsEnum`) e o Prisma Client.
8. **Serviço único no CapRover** (backend servindo o SPA). Dois apps exigiriam CORS, cookie
   compartilhado e nova decisão aqui.
9. **Módulo não acessa dados de outro módulo** (seção 3). Toda exceção é dívida arquitetural
   e precisa de decisão registrada.
10. **`NotFoundModule` por último** no `app.module.ts` (ver 7.6).

## 9. Ambiente e execução

- Node ≥ 22. **Atenção:** esta máquina tem duas versões de Node (22 em
  `/opt/data/home/.local/bin/node`, usada pelo shell interativo; 26 em
  `/usr/local/bin/node`, usada por processos em background). O adapter libSQL funciona nas
  duas — é justamente por isso que ele foi escolhido.
- Portas: backend `3001`, frontend `5173` (proxy `/api`).
- Variáveis: `backend/.env` (`DATABASE_URL`, `PORT`, `CORS_ORIGINS`, `FRONTEND_DIST`
  opcional) e `frontend/.env` (`VITE_API_URL`, padrão `/api`).
- `backend/dev.db` é o SQLite de desenvolvimento (não versionado).

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

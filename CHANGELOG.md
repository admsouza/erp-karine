# CHANGELOG.md — ERP Clínica

Mais recente no topo. Formato: **data · módulo · alteração · impacto**.

---

## 2026-09-13 · banco de dados + deploy · PostgreSQL e publicação no CapRover

**Alteração**

- Banco trocado de **SQLite para PostgreSQL** (`srv-captain--postgresql`), a pedido do
  cliente, com driver adapter `@prisma/adapter-pg` (node-postgres, JS puro).
  Removidas as dependências `@prisma/adapter-libsql`, `@libsql/client` e `better-sqlite3`.
- Migração `init` recriada para Postgres; enums agora são **tipos nativos** do banco.
  Bancos: `erp_estetica` (produção) e `erp_estetica_dev` (desenvolvimento e testes e2e).
- `PrismaService` passa a exigir `DATABASE_URL` — se faltar, a aplicação falha na hora com
  mensagem clara em vez de subir apontando para o banco errado.
- Deploy criado: `Dockerfile` multi-stage (build do frontend + build do backend + runtime
  não-root com `tini` e `HEALTHCHECK`), `captain-definition`, `.dockerignore` e
  `backend/docker-entrypoint.sh` rodando `prisma migrate deploy` antes de subir a API.
  O CLI do Prisma foi movido de `devDependencies` para `dependencies` (é usado no boot).
- CapRover: `containerHttpPort=3001`, `forceSsl=true`, `DATABASE_URL` do Postgres e volume
  `erp-estetica-data` mantido (não usado: o banco saiu do container).
- Infra **disponível e não usada** ficou registrada em `ARCHITECTURE.md`: Redis
  (`srv-captain--redis`) e MinIO/S3 (`storage-api.solucoes.cloud`).

**Impacto**

- Sistema publicado em **https://erp-estetica.solucoes.cloud** (API + SPA no mesmo container).
- Deploy e restart **não apagam mais dado**: o banco vive fora do container.
- Duas falhas reais de build foram corrigidas na publicação: `prisma generate` sem
  `DATABASE_URL` no build (fallback explícito no `prisma.config.ts`) e `.dockerignore`
  deixando `backend/.env` entrar na imagem (padrão `**/.env`).
- Quem for rodar localmente precisa de um PostgreSQL acessível em `DATABASE_URL`
  (ver `backend/.env.example`).
- Validação de status ganha uma segunda barreira: o próprio banco recusa valor fora do enum.

---

## 2026-09-13 · arquitetura (global) · realinhamento à arquitetura modular

**Alteração**

- Backend reorganizado como monólito modular: domínios movidos de `src/<dominio>/` para
  `src/modules/<dominio>/{controllers,services,dto,repositories,entities}` e `src/common/`
  reduzido ao que é genérico (`database`, `exceptions`, `health`, `pagination`, e as pastas
  reservadas `guards`, `interceptors`, `decorators`, `utils`).
- `common/prisma` → `common/database` (`PrismaService` + `DatabaseModule`); `common/filters`
  → `common/exceptions` (filtro padronizado + `NotFoundModule`); `src/health` →
  `common/health`. Removidos dois filtros mortos da iteração anterior.
- Frontend reorganizado em `app/` (router, providers, layout), `features/<dominio>/`
  (`api`, `components`, `hooks`, `pages`, `types`) e `shared/` (api, components, hooks,
  types, utils). Tipos de status saíram do arquivo único `src/types/index.ts` para
  `features/<modulo>/types`.
- Schema Prisma ajustado: enum `TransactionOrigin` agora `APPOINTMENT | SUBSCRIPTION | MANUAL`;
  `isActive` → `active` (Client, Procedure, SubscriptionPlan, Protocol); `inactivatedAt` →
  `deactivatedAt`; adicionados `deletedAt` (Client, Procedure, SubscriptionPlan, Protocol) e
  `externalReference` (FinancialTransaction). Migração `init` recriada do zero.
- Criado `MODULES.md` (obrigatório): responsabilidade, entidades, serviços públicos, eventos
  emitidos/consumidos, dependências permitidas, endpoints e regras de cada módulo.
- `ARCHITECTURE.md` reescrito com regras de dependência entre módulos, responsabilidade das
  camadas, proibições de importação no frontend e decisões 7.12 a 7.14.

**Impacto**

- Nenhum endpoint público foi quebrado (`/api/health`, `/api/docs` seguem iguais).
- **Banco de desenvolvimento recriado** (não havia dado real) — quem tiver `dev.db` antigo
  precisa rodar `npm run db:migrate` novamente.
- O padrão de onde colocar código mudou: implementar módulo novo agora segue
  `modules/<dominio>/` no backend e `features/<dominio>/` no frontend.
- Verificação repetida após a mudança: typecheck, lint, e2e (3/3) e build passando nos dois
  projetos; backend e frontend subindo e respondendo.

---

## 2026-09-13 · projeto · Fase 1 (fundação)

**Alteração**

- Criado o monorepo `erp-karine/` com `backend/` (NestJS 12, ESM) e `frontend/` (React 19 +
  Vite 8 + Tailwind 4 + React Router + Axios), `.gitignore` e `README.md`.
- Prisma 7 + SQLite com driver adapter libSQL; 11 entidades e 6 enums; migração `init`.
- Valores monetários definidos em centavos (`Int`).
- `app.setup.ts` com prefixo `/api`, `ValidationPipe` global, CORS e Swagger; filtro global
  de erro com envelope `{ statusCode, error, message, path, timestamp }`.
- `GET /api/health` (API + banco). `ServeStaticModule` condicional para servir o SPA no
  mesmo app em produção.
- Layout administrativo com menu lateral, barra superior com status da conexão e layout
  responsivo; páginas base dos 7 módulos e página 404.
- Documentação persistente criada: `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`,
  `CHANGELOG.md` (e, no realinhamento, `MODULES.md`).
- Testes e2e do backend (Vitest): `/api/health`, contrato OpenAPI e 404 padronizado.

**Impacto**

- Base do projeto disponível: `npm run start:dev` no backend (3001) e `npm run dev` no
  frontend (5173). Nenhuma regra de negócio implementada ainda — os módulos começam na Fase 2.
- Código publicado em https://github.com/admsouza/erp-karine (branch `main`).

---

## 2026-09-13 · infra · publicação do repositório

**Alteração**

- Primeiro push para `https://github.com/admsouza/erp-karine` (branch `main`).

**Impacto**

- Confirmado que `.env`, `dev.db`, `node_modules` e o cliente Prisma gerado **não** entram no
  versionamento (75 arquivos versionados).
- O token de acesso precisa da permissão **Contents: Read and write** para push — sem ela o
  git responde 403 mesmo com o repositório legível.

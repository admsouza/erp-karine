# CHANGELOG.md — ERP Clínica

Registro resumido das alterações relevantes. Mais recente no topo.

## 2026-09-13 — Fase 1: fundação do projeto

**Estrutura**

- Criado o monorepo `erp-karine/` com `backend/` (NestJS) e `frontend/` (React + Vite).
- Adicionados `.gitignore` (node_modules, `*.db`, `.env`, dist, cliente Prisma gerado) e `README.md`.
- Criados os arquivos de continuidade: `PROJECT.md`, `ARCHITECTURE.md`, `TASKS.md`, `CHANGELOG.md`.

**Backend**

- NestJS 12 + TypeScript em ESM, build (`nest build`) validado.
- Prisma 7 + SQLite: `prisma.config.ts`, `prisma/schema.prisma` com 11 entidades e 6 enums;
  migração `20260913011236_init` criada e aplicada (`backend/dev.db`).
- Valores monetários definidos em centavos (`Int`).
- `PrismaService` global usando driver adapter **libSQL** (trocado de `better-sqlite3`, que
  quebrava com `ERR_DLOPEN_FAILED` por causa das duas versões de Node da máquina).
- `app.setup.ts` com prefixo global `/api`, `ValidationPipe` (whitelist, forbidNonWhitelisted,
  transform), CORS configurável e Swagger.
- Filtro global `ApiExceptionFilter` com envelope único
  `{ statusCode, error, message, path, timestamp }`; `NotFoundModule` garante 404 padronizado
  em `/api/*` (importado por último — ordem importa).
- `GET /api/health` informando status da API e do banco.
- Módulos de domínio criados como estrutura: clients, procedures, appointments, subscriptions,
  financial, protocols, exams, dashboard.
- `ServeStaticModule` condicional: o backend serve o build do frontend quando `frontend/dist` existe.
- Testes e2e (Vitest) cobrindo `/api/health`, `/api/docs-json` e o 404 padronizado: 3/3 passando.

**Frontend**

- React 19 + TypeScript + Vite 8 + Tailwind CSS 4 (CSS-first) + React Router 7 + Axios.
- Estrutura `api/ components/ hooks/ layouts/ pages/ types/ utils/`.
- Layout administrativo com menu lateral (Dashboard, Clientes, Agenda, Assinaturas, Financeiro,
  Protocolos, Exames), barra superior com indicador de conexão com a API e rodapé; menu em
  gaveta no mobile.
- Componentes reutilizáveis: `Card`, `StatCard`, `PageHeader`, ícones SVG inline.
- Páginas dos 7 módulos com estado vazio explicativo + página 404 própria.
- Cliente HTTP único (`api/client.ts`) com tradução padronizada dos erros da API; utilitários de
  formatação de moeda (centavos→BRL) e data em pt-BR.
- Proxy de `/api` para `http://localhost:3001` no Vite; build de produção validado
  (`tsc -b && vite build` sem erros).

**Verificações executadas**

- `npm run build` no backend e no frontend: exit 0.
- `prisma migrate dev --name init`: migração aplicada.
- `npm run test:e2e`: 3 testes passando.
- HTTP: `/api/health` 200 (`database: up`), `/api/docs` 200, 404 de API em JSON,
  SPA servida em `/` e em `/clientes` (fallback de rota), assets do build servidos.
- Vite dev em `5173`: HTML 200, proxy `/api/health` 200, transform de TSX e CSS do Tailwind OK.

**Repositório**

- Código publicado em https://github.com/admsouza/erp-karine (branch `main`, primeiro commit
  `9b031fd`, 75 arquivos). Confirmado que `.env`, `dev.db`, `node_modules` e o cliente Prisma
  gerado não entram no versionamento.

**Pendências**

- Deploy no CapRover ainda não configurado (Dockerfile, volume persistente, `migrate deploy`).
- Autenticação de acesso ainda não existe.
- Próxima fase: **Fase 2 — Clientes** (ver `TASKS.md`).

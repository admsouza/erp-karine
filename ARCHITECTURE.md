# ARCHITECTURE.md — ERP Clínica

> Registro das decisões arquiteturais. **Antes de mudar qualquer coisa listada na seção 6,
> justifique neste arquivo.** Leia junto com `PROJECT.md`, `TASKS.md` e `CHANGELOG.md`.

## 1. Arquitetura adotada

Monorepo simples com duas aplicações independentes:

```
frontend (SPA React)  ──HTTP/JSON──▶  backend (API REST NestJS)  ──▶  SQLite (arquivo)
        │                                     │
        └── em produção o backend também serve o build do frontend (mesma origem)
```

- **Um único app no CapRover** (`erp-estetica`): o NestJS expõe `/api/*` e serve o
  `frontend/dist` para o resto. Assim não há CORS em produção nem dois deploys para manter.
- **Em desenvolvimento** os dois processos rodam separados (Vite em `5173`, Nest em `3001`)
  e o Vite faz proxy de `/api` para o backend.
- Sem autenticação na Fase 1 (uso interno). É uma pendência explícita em `PROJECT.md`.

## 2. Organização do backend (NestJS)

Por domínio, cada módulo com `controller`, `service`, `dto/` e `module`:

```
src/
├── main.ts            # bootstrap (porta 3001)
├── app.setup.ts       # prefixo global /api, ValidationPipe, filtro, CORS, Swagger
├── app.module.ts      # composição dos módulos
├── common/
│   ├── prisma/        # PrismaService + PrismaModule (@Global)
│   ├── filters/       # ApiExceptionFilter (erro padronizado)
│   └── not-found.module.ts  # curinga de 404 da API (último import)
├── health/            # GET /api/health
└── clients/ procedures/ appointments/ subscriptions/ financial/ protocols/ exams/ dashboard/
```

Regras de implementação:

- Validação de entrada **sempre** no backend via DTO + `class-validator` / `class-transformer`.
  O frontend valida apenas para dar feedback rápido; nunca é a única barreira.
- Regra de negócio (inclusive financeira) fica no `service`, nunca no controller nem no frontend.
- `ValidationPipe` global com `whitelist`, `forbidNonWhitelisted` e `transform` — campo extra no
  payload é **erro**, não é ignorado silenciosamente.
- Erros: filtro global único devolve
  `{ statusCode, error, message, path, timestamp }`; 5xx nunca expõe detalhe interno.

## 3. Organização do frontend (Vite + React)

```
src/
├── api/        # cliente axios único + tradução de erro da API
├── components/ # Card, StatCard, PageHeader, Icons (SVG inline), Sidebar, Topbar
├── hooks/      # useApiHealth
├── layouts/    # AdminLayout (menu lateral + barra superior + <Outlet/>)
├── pages/      # uma página por módulo
├── types/      # tipos e "enums" compartilhados
└── utils/      # formatação (centavos→BRL, datas pt-BR)
```

- Interface sóbria: sem biblioteca de UI, sem animações além de transições curtas, paleta
  `slate` + `brand` (teal escuro). Ícones são SVG inline para não adicionar dependência.
- Desktop primeiro, com menu em gaveta no mobile/tablet.
- Status são **const objects + union types**, não `enum` do TypeScript (o tsconfig usa
  `erasableSyntaxOnly`). Espelham os enums do Prisma.

## 4. Modelo de dados

11 entidades em `backend/prisma/schema.prisma` (detalhes e relacionamentos em `PROJECT.md`).

Convenções obrigatórias:

- `id String @id @default(uuid())` em todas as entidades.
- `createdAt DateTime @default(now())` e `updatedAt DateTime @updatedAt`.
- Índices em colunas de filtro recorrente (`clientId`, `date`/`scheduledAt`, `status`, `isActive`).
- **Valores monetários em centavos (`Int`)**: `valueCents`, `amountCents`, `priceCents`,
  `contractedValueCents`, `defaultValueCents`.
- Inativação em vez de exclusão para dado histórico (`Client.isActive` + `inactivatedAt`,
  `Protocol.isArchived`). Exclusão física só para dado descartável (ex.: item de recomendação
  recém-criado) — e ainda assim, `ExamRecommendationItem` está em cascata com a recomendação.

## 5. Decisões técnicas (com o porquê)

| # | Decisão | Justificativa |
| - | ------- | ------------- |
| 5.1 | Monorepo com dois `package.json`, **sem** workspaces/nx/turbo | Dois projetos, dois comandos. Ferramenta extra não se paga aqui. |
| 5.2 | Backend em **ESM** (`"type": "module"`), imports com extensão `.js` | Padrão do NestJS 12. Manter a extensão `.js` em imports relativos é obrigatório. |
| 5.3 | Prisma 7: URL do banco em `prisma.config.ts` (não no `schema.prisma`) | Mudança do Prisma 7. O `schema.prisma` tem só `provider = "sqlite"`. |
| 5.4 | Generator `prisma-client` gerando em `backend/src/generated/prisma` (não versionado) | O cliente é TS e precisa ser compilado junto com a aplicação; `npm run db:generate` (e o `postinstall`) o recria. |
| 5.5 | Driver adapter **libSQL** (`@prisma/adapter-libsql`), não `better-sqlite3` | libSQL usa binário **N-API**: o mesmo `node_modules` funciona em qualquer versão de Node. `better-sqlite3` é compilado por `NODE_MODULE_VERSION` e quebra com `ERR_DLOPEN_FAILED` quando o runtime muda (aconteceu nesta máquina, que tem Node 22 e Node 26 instalados). |
| 5.6 | Erro 404 de `/api/*` por `NotFoundModule` importado **por último** | O Nest registra rotas na ordem de resolução dos módulos; o curinga `@All('*path')` importado antes engole rotas reais (a `/api/health` retornou 404 na primeira tentativa). Não mover esse import. |
| 5.7 | `ServeStaticModule` registrado **condicionalmente** (só quando `frontend/dist` existe) | Em desenvolvimento o build pode não existir e o backend precisa subir mesmo assim. `FRONTEND_DIST` permite apontar outro caminho. |
| 5.8 | Envelope de erro único em vez de um filtro por tipo de exceção | Um só lugar para formatar erro (menos duplicação) e nenhuma exceção escapa sem formato. |
| 5.9 | Testes com **Vitest** (não Jest) | É o que o scaffold do NestJS 12 já traz; trocar seria trabalho sem ganho. |
| 5.10 | Tailwind 4 **CSS-first** (`@import 'tailwindcss'` + plugin do Vite) | Tailwind 4 não usa mais `tailwind.config.js`; o tema é declarado em `@theme` no `src/index.css`. |
| 5.11 | Vitest e2e usam o mesmo `configureApp()` do `main.ts` | Testa exatamente a stack de produção (prefixo, pipe, filtro), em vez de um app "parecido". |

## 6. Decisões que NÃO devem ser alteradas sem justificativa registrada aqui

1. **Dinheiro em centavos (`Int`).** Trocar por `Float`/`Decimal` reintroduz erro de arredondamento.
   O SQLite não tem tipo decimal exato: `Decimal` do Prisma cai em `NUMERIC` (ponto flutuante).
2. **UUID como chave primária** em todas as entidades (não `Int` autoincrement).
3. **Não apagar histórico clínico e financeiro.** Cliente se inativa; sessão de protocolo é
   acrescentada, nunca sobrescrita.
4. **Anti-duplicidade de faturamento no banco**: `FinancialTransaction.appointmentId` e
   `subscriptionPaymentId` são `@unique`. Não remover — é a garantia de que o mesmo atendimento
   não vira duas receitas.
5. **Validação de entrada no backend** obrigatória em todo endpoint de escrita.
6. **Driver adapter libSQL** (ver 5.5).
7. **Enums materializados como TEXT no SQLite** — o banco **não** valida o domínio do status
   (o `migration.sql` mostra `TEXT`, sem `CHECK`). A validação real é o DTO (`@IsEnum`) e o
   Prisma Client. Não assumir que o banco barra status inválido.
8. **Serviço único no CapRover** (backend servindo o SPA). Se um dia houver dois apps, precisa
   de CORS, cookie/domínio compartilhado e novo registro aqui.

## 7. Ambiente e execução

- Node ≥ 22. **Atenção:** esta máquina tem duas versões de Node (22 em
  `/opt/data/home/.local/bin/node`, usada pelo shell interativo, e 26 em
  `/usr/local/bin/node`, usada por processos em background). O adapter libSQL funciona nas duas
  justamente por ser N-API — mantido assim de propósito.
- Portas: backend `3001`, frontend `5173` (proxy `/api`).
- Variáveis: `backend/.env` (`DATABASE_URL`, `PORT`, `CORS_ORIGINS`, `FRONTEND_DIST` opcional)
  e `frontend/.env` (`VITE_API_URL`, padrão `/api`).
- `backend/dev.db` é o arquivo SQLite local (não versionado).

## 8. Padrões de código

TypeScript estrito, sem `any`; funções pequenas e nomes claros; sem abstração especulativa;
sem biblioteca nova sem necessidade; regra de negócio fora da interface; módulo que funciona
não é reescrito sem motivo. Prettier e oxlint já configurados nos dois projetos.

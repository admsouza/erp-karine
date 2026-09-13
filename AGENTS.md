# AGENTS.md — handoff do projeto ERP Clínica (erp-karine)

> Este arquivo é o **ponto de entrada para qualquer agente que for continuar este projeto**.
> Leia ele inteiro antes de escrever código. Depois leia `PROJECT.md`, `ARCHITECTURE.md`,
> `MODULES.md`, `TASKS.md` e `CHANGELOG.md` (a raiz do repo é a fonte da verdade).
> Última atualização: 2026-09-13, ao final da Fase 5 (assinaturas).

---

## 1. O que é

Sistema de gestão para a clínica de estética da **Dra. Karine** (cliente único).
Módulos previstos: clientes, procedimentos, agendamentos, assinaturas, financeiro,
protocolos, exames, dashboard.

- **Repo:** `admsouza/erp-karine` (GitHub, privado) · clone de trabalho em `/opt/data/erp-karine`
- **Produção:** https://erp-estetica.solucoes.cloud (CapRover, app `erp-estetica`)
- **Usuário de produção:** `mkarineon@gmail.com` (perfil ADMIN) — senha com o cliente
- **Estado:** Fases 1, 2 (clientes), 2.5 (autenticação), 3 (procedimentos), 4 (agenda) e 5 (assinaturas) implementadas.
  **Próxima: Fase 6 — `financial`.**

## 2. Regras de arquitetura que NÃO podem ser quebradas

1. **Monólito modular.** Nada de microserviços. Cada domínio é um módulo independente em
   `backend/src/modules/<dominio>/` com `{controllers,services,dto,repositories,entities}`.
   Nunca criar um módulo gigante com regras de vários domínios.
2. **Regra de dependência entre módulos:** um módulo **não** acessa repository, controller,
   implementação interna ou tabela de outro módulo. A comunicação é por **serviço público
   exportado** (ex.: `ClientQueryService`, `ProcedureQueryService`), contrato, DTO ou evento.
   O repository de um módulo só pode ser usado **dentro** desse módulo.
3. **Camadas:** controller só recebe/valida/delega; service tem a regra de negócio
   (casos de uso, evitar God Service); repository só fala com Prisma (sem regra de negócio);
   DTO com `class-validator`/`class-transformer` — **nunca confiar só na validação do frontend**.
4. **Stack fixa** (não trocar sem registrar decisão em `ARCHITECTURE.md`):
   backend NestJS + TypeScript + Prisma + PostgreSQL + REST + Swagger;
   frontend React + TypeScript + Vite + Tailwind + React Router.
5. **Dinheiro sempre em centavos (`Int`)** — nunca float. IDs são UUID.
6. **Sem exclusão física:** `active`/`deactivatedAt`/`deletedAt`. A API não expõe `DELETE` de entidade
   de domínio (a exceção é a correção de vigência de preço).
7. **Disciplina de documentação (não negociável):** antes de começar, ler os docs; ao terminar,
   atualizar `PROJECT.md`, `MODULES.md`, `TASKS.md` e `CHANGELOG.md` (e `ARCHITECTURE.md` se houver
   decisão técnica). Marcadores em `TASKS.md`: `[ ]` `[~]` `[x]`.
8. **Não iniciar várias funcionalidades grandes ao mesmo tempo** nem duas fases simultâneas.
   Não apagar nada existente sem necessidade.

## 3. Ritual de trabalho (seguido nas fases 2, 2.5, 3 e ajustes)

1. Ler os 5 docs + `git status` + `git branch` (descobrir a fase exata).
2. `git checkout main && git pull` → `git checkout -b feat/<assunto>`.
3. Implementar backend + testes (unit + e2e) → frontend → `tsc`, `oxlint`, builds.
4. Atualizar os docs na mesma branch.
5. Commit + push + **Pull Request** (`gh` não está autenticado; usar a API — ver §6).
6. **Esperar o OK do cliente.** Não publicar sem autorização explícita.
7. Com o OK: merge do PR (`merge_method: merge`) → `git checkout main && git pull` → deploy → verificar.
8. Verificar em produção **por API e em navegador real** e registrar a publicação no `CHANGELOG.md`.

## 4. Como rodar e testar

```bash
# backend (dev, banco erp_estetica_dev)
cd /opt/data/erp-karine/backend
npm run build && node dist/main.js        # sobe em :3001 (carrega backend/.env)
npm test                                  # unitários (vitest)
npm run test:e2e                          # e2e contra o Postgres de dev
npx tsc --noEmit -p tsconfig.json && npm run lint

# frontend (dev, proxy /api → :3001)
cd /opt/data/erp-karine/frontend
npm run dev                               # :5173
npx tsc --noEmit -p tsconfig.app.json && npm run lint && npm run build

# usuário (o primeiro usuário é criado por CLI; não há tela de cadastro)
cd /opt/data/erp-karine/backend
node dist/scripts/create-user.js --email x@y.com --password 'Senha123' --name 'Nome' [--no-force-change]
```

Usuário de desenvolvimento já criado: `karine@clinica.local` / senha definida em teste local
(banco `erp_estetica_dev`, pode ser recriado pela CLI acima).

**Depois de mexer no backend, reiniciar o processo:** matar `node dist/main.js` e subir de novo
(o `dist` só vale após `npm run build`).

## 5. Infra, banco e verificação em produção

- O agente roda **no próprio host do CapRover** — dá para usar `docker` direto.
- Postgres: container `srv-captain--postgresql.1.ea97uit9mzv4bahf7x900w05k`
  - produção: banco `erp_estetica` · dev/e2e: `erp_estetica_dev`
  - consulta: `docker exec srv-captain--postgresql.1.ea97uit9mzv4bahf7x900w05k psql -U postgres -d erp_estetica -c '<sql>'`
  - **atenção:** as tabelas do Prisma são `"User"`, `"Procedure"`, `"ProcedurePrice"`, `"Client"` (com aspas, case-sensitive; não há `@@map`).
- Container da app: `docker ps -a --format '{{.Names}}' | grep '^erp-estetica\.'` → `docker logs <container>`.
- **Deploy:** `sh /opt/data/cache/erp-deploy.sh` (monta o tar sem `node_modules`/`dist`/`.env` e faz o
  deploy no CapRover). Rodar em background e esperar; leva ~4-6 min.
- **Cuidado:** logo após o deploy há uma janela de restart — chamadas nesse intervalo devolvem **502**.
  Espere ~20s e repita antes de concluir que quebrou.
- A migração roda no boot do container (`docker-entrypoint.sh` → `prisma migrate deploy`).

### Verificação de UI em navegador real (foi assim que bugs reais apareceram)

O harness de browser do Hermes não sobe neste ambiente. O caminho que funciona: subir o chromium com
CDP e falar com ele por `websocket-client` (`suppress_origin=True`, senão o CDP recusa por `Origin`).

```bash
# já pode estar rodando; se não estiver:
/opt/data/home/.local/bin/chromium --headless=new --remote-debugging-port=9222 \
  --remote-debugging-address=127.0.0.1 --no-sandbox --disable-gpu --disable-dev-shm-usage \
  --user-data-dir=/tmp/chrome-hermes about:blank &

curl -s http://127.0.0.1:9222/json/version   # confirma o CDP de pé
```

```bash
cd /opt/data/cache && uv run --with websocket-client python erp-unidade-ui.py
```

Scripts prontos nesse diretório: `erp-*-ui*.py` (login, telas, cadastro por formulário),
`erp-*-smoke.py` (API), `erp-vigencia-prod-verify.py`, `erp-unidade-prod-ui.py`,
`erp-f3-prod-verify.py`, `erp-prod-ui-login.py`.
Para render simples de uma página sem CDP: `chrome-headless-shell --dump-dom --virtual-time-budget=7000 <url>`.

**Ao automatizar campos, localize-os pelo `<label>` (`label.htmlFor` → `getElementById`)**, nunca por
índice/ordem: a listagem tem selects/inputs próprios e você vai preencher o campo errado (aconteceu).

## 6. Armadilhas já pagas (não repita)

| Armadilha | O que aconteceu / como evitar |
| --------- | ------------------------------ |
| `git push` 403 | Token fine-grained precisava de **Contents: Read and write** (e depois **Pull requests: Read and write** para abrir PR). Token em `/opt/data/cache/erp_gh_token.txt` (chmod 600). `gh` não está autenticado: use a API via Python (`urllib`), como em `/opt/data/cache/erp-*-pr.py`. |
| Senha/segredo em imagem Docker | `.dockerignore` com `.env` **não** pega `backend/.env`; use `**/.env`. Verificado numa imagem de teste. |
| `prisma generate` no build | Quebrava sem `DATABASE_URL` → fallback explícito só para `generate` em `prisma.config.ts` (runtime continua exigindo). |
| Aviso `libssl/openssl` no build | É do estágio de build (sem openssl); `generate` funciona. Não bloqueia. |
| Node duplicado | Shell = Node 22, processos em background = Node 26. Use libs **JS puro** (`bcryptjs`, `@prisma/adapter-pg`); binário nativo quebra por `NODE_MODULE_VERSION`. |
| `active=false` virando `true` | `enableImplicitConversion` converte `Boolean('false')` em `true`. Contrato de query booleano é **string explícita** `'true' \| 'false'` com `@IsIn`. |
| `OriginGuard` bloqueando o próprio app | Comparar `Origin` só com `Host` quebra quando há proxy (Vite troca o `Host`). O guard considera `X-Forwarded-Host` e `CORS_ORIGINS`, e aceita mesmo hostname em porta diferente. **Sempre teste o caso positivo**, não só o negativo. |
| Botão "não faz nada" no automático | Se o teste só cobre o caso negativo, o caminho feliz quebra silenciosamente. Testar o caminho feliz. |
| `useId` ausente | `Input`/`Select` sem `name`/`id` ficavam sem `<label>` associado. Ambos geram `id` com `useId` — mantenha. |
| `session_model_usage.tokens` | A coluna **não existe**: o total é `input+output+cache_read+cache_write+reasoning`. |
| `hash()` do Python | É aleatório por processo (PYTHONHASHSEED): para id determinístico use `hashlib.sha1`. |
| Migração que apaga coluna | `prisma migrate dev` gera `DROP COLUMN` **sem backfill** — já perdemos quase os 6 procedimentos. Migração com dado real exige **testar contra cópia dos dados de produção** (script modelo: `/opt/data/cache/erp-test-migration.sh`, que copia a tabela de produção para um banco de teste e roda a migração ali). |
| Fuso horário | Colunas de data são `DATE` e o "hoje" da clínica é `America/Recife` (`utils/date.ts` no módulo procedures). Sem isso a virada do dia cai às 21h. |
| Patch silencioso | `patch` com âncora não única ou inexistente falha **sem erro** se você não olhar o retorno. Imprima o resultado e confirme com `grep` depois. |
| Ordem do `NotFoundModule` | Tem que ser o **último** em `app.module.ts`, senão o curinga engole `/api/health`. |
| Swagger e guards | O `SwaggerModule` registra handlers direto no Express e **não passa pelos guards** — a proteção é um middleware no `app.setup.ts`, registrado **antes** do Swagger. |

## 7. Estado atual (o que está em produção)

- **Autenticação:** sessão em Postgres + cookie `httpOnly` (`erp_session`), token hasheado (sha256),
  7 dias com renovação, `bcryptjs`. Guard global (`APP_GUARD`) com `@Public()` apenas em
  `GET /api/health` e `POST /api/auth/login`. Documentação Swagger também exige sessão.
  `mustChangePassword` obriga troca no primeiro acesso. Sem autorização por perfil (todo logado tem
  acesso total) e sem reset de senha por e-mail — **pendências conhecidas**.
- **Clientes:** CRUD + inativar/reativar, CPF validado por dígito verificador e único, busca e filtro,
  página de detalhe.
- **Assinaturas:** planos com periodicidade e sessões, contratação por cliente com snapshot comercial,
  status, pagamentos e filtros. `SubscriptionQueryService` é o contrato público para financeiro/dashboard.
- **Procedimentos:** catálogo com **unidade de medida** (`ProcedureUnit`: SESSAO/APLICACAO/REGIAO/ML/
  UNIDADE/HORA/PACOTE) e **valor unitário com vigência** (`ProcedurePrice`):
  - `validFrom`/`validTo` (`DATE`, `validTo` nulo = vigência atual), histórico nunca reescrito;
  - novo valor fecha a vigência anterior no dia em que a nova começa; vigência só entra depois da
    mais recente (409); remover a atual faz a anterior voltar a valer;
  - **a vigência atual pode ser corrigida** (`PATCH /api/procedures/:id/prices/:priceId`); vigência
    encerrada não é editável (409);
  - `ProcedureQueryService.valueOn(id, data)` = valor que valia no dia (**é o contrato que o financeiro
    vai usar**; atendimento antigo não pode ser recalculado com o preço de hoje — grave o valor
    aplicado no registro do atendimento);
  - tela `/procedimentos/:id` com histórico e ação "Alterar valor".
- Os **6 procedimentos de produção** hoje estão todos como `SESSAO` e com o valor migrado
  (Botox R$ 900,00; Bigode Chinês R$ 900,00; Labial R$ 750,00; Malar R$ 900,00; Mandibula R$ 900,00;
  Mento R$ 750,00), **sem duração e sem descrição**. O cliente ia ajustar unidade e valor pelo app.

## 8. Próximos passos (em ordem)

1. **Ajuste do cliente nos 6 procedimentos** (unidade + valor vigente). Ele pode pedir para aplicar
   em lote: nesse caso use `PATCH /api/procedures/:id` (unidade) e
   `PATCH /api/procedures/:id/prices/:priceId` (valor vigente) — nunca crie vigência nova para corrigir
   valor atual, e nunca edite vigência encerrada.
2. **Fase 6 — `financial`**, **7 — `protocols`**, **8 — `exams`**,
   **9 — `dashboard`**, **10 — revisão final** (ver `TASKS.md`).
4. **Dívidas conhecidas** (registradas em `TASKS.md`): autorização por perfil, reset de senha por
   e-mail, **backup `pg_dump` agendado + teste de restauração**, 9 vulnerabilidades altas nas
   dependências do frontend (rodada de atualização com teste), aviso de openssl no build.

## 9. Como falar com o cliente (ele é quem decide)

- Ele fala **pt-BR**, prefere respostas **curtas e diretas**, e decide de forma telegráfica
  ("ok", "seguir", "Fazer A"). Ofereça **opções com recomendação** e siga a recomendação quando ele
  aprovar.
- **Nunca publicar em produção sem OK explícito.** PR antes, deploy depois.
- Relate o que foi **verificado de fato** (comando/saída), não o que deveria acontecer. Se algo falhou
  ou ficou pendente, diga na primeira linha.
- Prefere **correção visual** a explicação longa; valoriza recomendação com visão de analista sênior
  (diga o trade-off e recomende).
- PostgreSQL em projetos novos (preferência dele), não SQLite.

## 10. Custo (regra vigente do cliente)

**Todo uso do Hermes precisa ter work item** no painel `custo-ai.solucoes.cloud` — nada órfão.
- Work item explícito ao começar um projeto:
  `python3 /opt/data/scripts/custo_ai_workitems.py start <slug> --product <produto> --type feature`
  e `... stop` ao terminar (troque `<slug>` por `erp-estetica` para este projeto).
- O `scripts/custo_ai_sync.py` roda por cron a cada 30 min, é idempotente e, quando não há item
  explícito, atribui o uso a um **item por sessão** (título = origem + primeira mensagem). Buckets
  diários foram extintos de propósito — não reintroduzir.
- O work item `erp-estetica` foi aberto numa janela que **não captura sessões futuras**: ao continuar
  o projeto, abra um item novo com o comando acima.

## 11. Credenciais e segredos (valores ficam nos arquivos, nunca no chat)

- `/opt/data/.env` — GitHub token, ingest do custo-ai, MinIO
- `/opt/data/erp-karine/backend/.env` — `DATABASE_URL` (dev), Redis, MinIO, `CORS_ORIGINS`
- `/opt/data/cache/erp_gh_token.txt` — token GitHub (fine-grained, Contents + Pull requests: write)
- `~/.git-credentials` — credencial do `git push`
- Senha do banco de produção: no `DATABASE_URL` gravado nas env vars do app no CapRover
  (e no `.env` de dev)
- **Nunca imprimir segredo em claro no chat.** Scripts temporários que usem senha devem ser apagados
  depois (foi feito assim na criação do usuário de produção).

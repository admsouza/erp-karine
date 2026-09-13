# PROJECT.md — ERP Clínica

> **Fonte da verdade do projeto.** Antes de qualquer tarefa, leia este arquivo junto com
> `ARCHITECTURE.md`, `MODULES.md`, `TASKS.md` e `CHANGELOG.md`, rode `git status`, examine o
> módulo que será alterado e verifique os testes existentes. O repositório manda — a memória
> da conversa não.
>
> **Agente de IA continuando o projeto:** o ponto de entrada é o **`AGENTS.md`** (handoff com
> estado atual de produção, ritual branch → testes → PR → OK → deploy, infra, credenciais,
> armadilhas já pagas e próximos passos).

- **Repositório:** https://github.com/admsouza/erp-karine
- **App CapRover:** `erp-estetica` → https://erp-estetica.solucoes.cloud
- **Cliente:** clínica de estética
- **Estado atual:** Fases 1 a 5 concluídas: fundação, clientes, autenticação, procedimentos, agenda e assinaturas.
  Próxima: Fase 6 — módulo `financial`.

---

## 1. Objetivo

Sistema de gestão para uma clínica, nascendo **simples** mas com arquitetura que permite
crescimento contínuo sem quebrar o que já funciona. Módulos: clientes, procedimentos,
agendamentos, planos de assinatura, faturamento, protocolos de atendimento, recomendações
de exames e dashboard.

Prioridade técnica: **baixo acoplamento + alta coesão + separação clara de
responsabilidades**. Cada módulo evolui com o mínimo de impacto nos demais.

## 2. Stack

| Camada   | Tecnologias                                                            |
| -------- | ---------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Axios     |
| Backend  | NestJS 12, TypeScript, REST, Swagger (OpenAPI), class-validator         |
| Dados    | PostgreSQL + Prisma ORM 7 (driver adapter `pg`)                           |
| Testes   | Vitest                                                                  |

Segurança das dependências: `npm audit` retorna zero vulnerabilidades nos dois projetos.
NestJS permanece na linha 12 e Prisma na linha 7; correções transitivas temporárias estão
registradas em `ARCHITECTURE.md` (decisão 7.34).

Tecnologia só é substituída com necessidade real e decisão registrada em `ARCHITECTURE.md`.

## 3. Como executar

Requisito: Node.js 22 ou superior.

```bash
# Backend (API em 3001, docs em /api/docs)
cd backend
cp .env.example .env      # primeira vez
npm install               # o postinstall roda `prisma generate`
npm run db:migrate        # aplica as migrações no PostgreSQL de desenvolvimento
npm run start:dev

# Frontend (5173, com proxy de /api para o backend)
cd frontend
npm install
npm run dev
```

Produção (um único app: o backend serve o build do frontend):

```bash
cd frontend && npm run build
cd ../backend && npm run build && npm run start:prod
```

Scripts: backend `start:dev`, `build`, `test:e2e`, `db:migrate`, `db:generate`, `db:studio`,
`db:reset`, `lint`; frontend `dev`, `build`, `lint`.

### Primeiro acesso (autenticação)

O sistema exige login. O primeiro usuário é criado por CLI (não há tela de cadastro):

```bash
cd backend
node dist/scripts/create-user.js --email voce@clinica.com.br --password "SenhaForte123" --name "Seu Nome"
```

A senha informada é **temporária**: o sistema obriga a troca no primeiro acesso.
A sessão usa cookie `httpOnly` de 7 dias (ver `ARCHITECTURE.md`, seção 8.2).

## 4. Configuração

| Onde | Variável | Para quê |
| ---- | -------- | -------- |
| `backend/.env` | `DATABASE_URL` | conexão PostgreSQL (`postgresql://...`); em produção `srv-captain--postgresql:5432`, banco `erp_estetica` |
| `backend/.env` | `PORT` | porta da API (3001) |
| `backend/.env` | `CORS_ORIGINS` | origens liberadas em desenvolvimento |
| `backend/.env` | `FRONTEND_DIST` | caminho alternativo do build do SPA (opcional) |
| `frontend/.env` | `VITE_API_URL` | base da API (padrão `/api`) |

## 5. Funcionalidades existentes

- `GET /api/health` — status da API e do banco.
- `GET /api/docs` e `/api/docs-json` — documentação Swagger.
- Envelope de erro padronizado em toda a API, inclusive 404 de rota inexistente.
- Layout administrativo (menu lateral com os 7 módulos, barra superior com status da
  conexão, responsivo com gaveta no mobile) e páginas base de cada módulo com estado vazio.
- Build do frontend servido pelo backend quando `frontend/dist` existe.
- **Módulo `clients` implementado (Fase 2)**: CRUD sem exclusão física, busca paginada,
  inativação/reativação, CPF validado e único, Swagger completo, 6 testes unitários e
  e2e do fluxo inteiro. Frontend: lista com busca (debounce), filtro de situação, paginação,
  formulário em modal e página do cliente com as seções dos módulos futuros.
- Estrutura modular dos 8 domínios criada; `clients`, `procedures`, `appointments` e
  `subscriptions` já têm backend, frontend e testes completos. Os demais entram em suas fases.

## 6. Regras de negócio

### Clientes
- Cliente não é excluído: inativação (`active = false`, `deactivatedAt`).
- CPF único quando informado. Busca por nome, CPF, telefone e WhatsApp.
- Página do cliente agrega dados de outros módulos **via serviço público**, sem duplicar
  regra de negócio.

### Procedimentos

Catálogo implementado (Fase 3): cadastro, edição, busca, filtro por situação e
duração aproximada; inativação sem excluir. É o catálogo referenciado por agenda,
protocolos e financeiro.

**Unidade de medida:** cada procedimento declara a base de cobrança (Sessão,
Aplicação, Região, ml, Unidade, Hora, Pacote/Combo) e o valor é exibido como
"R$ 900,00 / região". A unidade pode ser trocada a qualquer momento no cadastro.

**Valor unitário com vigência:** o preço não é um campo fixo — cada valor vale a
partir de uma data (`validFrom`) e o valor anterior é encerrado automaticamente
quando entra um novo. A tela do procedimento mostra o valor vigente e o histórico
completo, e a API permite consultar o valor que valia em qualquer data
(`/api/procedures/:id/price-on?date=`). Nada é reescrito: reajustes entram como
vigência nova, então relatórios e atendimentos antigos continuam com o preço da época.
- Nome, descrição, duração aproximada, valor padrão, ativo.
- Outros módulos referenciam por **id**; onde o dado precisa sobreviver a mudanças de
  cadastro, guarda-se *snapshot* (caso de `Appointment.procedureName`).

### Agendamentos
- Cliente, procedimento, profissional, data, horário, valor, observação.
- Status: `AGENDADO`, `CONFIRMADO`, `REALIZADO`, `CANCELADO`, `FALTOU`.
- Agenda diária, semanal, por período, por cliente e por status. Não se exclui: cancela.
- Snapshot de nome, unidade, quantidade, valor unitário e total preserva o valor contratado.
- Estados finais são imutáveis; agendado/confirmado podem cancelar ou registrar falta.

### Assinaturas
- Plano: nome, descrição, valor, periodicidade, quantidade de sessões, ativo.
- Assinatura: cliente, plano, início, fim, valor contratado, forma de pagamento, status
  (`ATIVA`, `CANCELADA`, `ENCERRADA`, `INADIMPLENTE`).
- Pagamentos da assinatura são registrados e podem gerar lançamento financeiro.
- Implementado: planos com inativação/reativação; contrato com snapshot de nome, periodicidade, sessões e valor do plano; ciclo de status e pagamentos com filtros.
- Uma assinatura ativa/inadimplente do mesmo plano por cliente; sem exclusão física.

### Financeiro
- `FinancialTransaction`: cliente, descrição, categoria, valor, data, forma de pagamento,
  origem (`APPOINTMENT`, `SUBSCRIPTION`, `MANUAL`), referência externa opcional.
- Formas: `PIX`, `DINHEIRO`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `TRANSFERENCIA`, `OUTRO`.
- **Impede lançamento duplicado** para o mesmo atendimento/pagamento (vínculos únicos).
- Regra financeira vive no backend, nunca no frontend.

### Protocolos
- Cliente pode ter vários protocolos; cada um com várias sessões.
- **Histórico clínico nunca é sobrescrito**: sessões são acrescentadas em ordem cronológica.

### Recomendações de exames
- Recomendação com vários itens; status `RECOMENDADO`, `REALIZADO`, `CANCELADO`.
- **Só registra** a recomendação profissional: sem diagnóstico automático, sem interpretação
  de resultado. Visualização limpa, preparada para impressão/PDF.

### Dashboard
- Apenas consulta e agregação: faturamento do mês, clientes cadastrados, atendimentos do
  dia, atendimentos do mês, assinaturas ativas, próximos atendimentos.
- Consulta os módulos donos dos dados; nenhuma regra de negócio própria.

### Dinheiro
- Sempre em **centavos (inteiro)** no banco, na API e no estado do frontend. Conversão para
  exibição apenas na borda da interface.

## 7. Entidades e relacionamentos

`Client`, `Procedure`, `Appointment`, `SubscriptionPlan`, `ClientSubscription`,
`SubscriptionPayment`, `FinancialTransaction`, `Protocol`, `ProtocolSession`,
`ExamRecommendation`, `ExamRecommendationItem` — todas com UUID, `createdAt`, `updatedAt` e
soft delete conforme a entidade. O dono de cada entidade está em `MODULES.md`; o schema é
`backend/prisma/schema.prisma`.

```
Client 1─N Appointment            Appointment N─1 Procedure (opcional)
Client 1─N ClientSubscription     ClientSubscription N─1 SubscriptionPlan
ClientSubscription 1─N SubscriptionPayment
Client 1─N FinancialTransaction   FinancialTransaction N─1 Appointment (opcional, único)
                                  FinancialTransaction N─1 SubscriptionPayment (opcional, único)
Client 1─N Protocol               Protocol 1─N ProtocolSession
Client 1─N ExamRecommendation     ExamRecommendation 1─N ExamRecommendationItem
```

## 8. Estrutura de pastas

```
erp-karine/
├── PROJECT.md  ARCHITECTURE.md  MODULES.md  TASKS.md  CHANGELOG.md  README.md
├── backend/src/{main.ts, app.module.ts, app.setup.ts, modules/, common/, generated/}
├── backend/{prisma/, prisma.config.ts, test/, .env.example}
└── frontend/src/{app/, features/, shared/, main.tsx, index.css}
```

Detalhamento das camadas e das regras de dependência: `ARCHITECTURE.md` (seção 2 e 3).

## 9. Funcionalidades pendentes

Ordem de execução em `TASKS.md`: Fase 2 `clients` → 3 `procedures` → 4 `appointments` →
5 `subscriptions` → 6 `financial` → 7 `protocols` → 8 `exams` → 9 `dashboard` → 10 revisão
arquitetural, UX, validações, testes e documentação final.

Decisões ainda abertas: autorização por perfil/recuperação de senha e rotina de backup do banco
(`pg_dump` agendado). Deploy já configurado: imagem única no CapRover servindo API + SPA,
com migração aplicada no boot do container. Infra disponível e ainda não usada: Redis
(cache/sessão) e MinIO (fotos e fichas digitalizadas).

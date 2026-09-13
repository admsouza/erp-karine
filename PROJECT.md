# PROJECT.md — ERP Clínica

> **Este arquivo é a fonte da verdade do projeto.** Leia-o antes de qualquer tarefa,
> junto com `ARCHITECTURE.md`, `TASKS.md` e `CHANGELOG.md`, e confira `git status` e o código
> atual. Nunca assuma que o histórico da conversa está correto — o repositório manda.

- **Repositório:** https://github.com/admsouza/erp-karine
- **App CapRover:** `erp-estetica`
- **Cliente:** clínica de estética (Dra. Karine)
- **Estado atual:** Fase 1 concluída (estrutura, banco, layout inicial). Ver `TASKS.md`.

---

## 1. Objetivo do sistema

Aplicação de gestão para uma clínica, com foco em uso simples no dia a dia, código limpo e
manutenção barata. Cobre cadastro de clientes, agenda de atendimentos, planos de assinatura,
controle financeiro, fichas de protocolo clínico e recomendações de exames, com um dashboard
inicial resumindo a operação.

## 2. Stack

| Camada  | Tecnologias                                                             |
| ------- | ----------------------------------------------------------------------- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router 7, Axios    |
| Backend  | NestJS 12, TypeScript, REST, Swagger (OpenAPI), class-validator         |
| Dados    | SQLite + Prisma ORM 7 (driver adapter libSQL)                           |
| Testes   | Vitest (e2e no backend)                                                 |

## 3. Funcionalidades existentes (implementadas e verificadas)

- **Fase 1 — fundação**
  - Monorepo `backend/` + `frontend/`, banco SQLite com schema completo e migração aplicada.
  - `GET /api/health` — status da API e do banco.
  - Swagger publicado em `/api/docs` (JSON em `/api/docs-json`).
  - Envelope de erro padronizado em toda a API, inclusive 404 de rota inexistente.
  - Build do frontend servido pelo backend (SPA com fallback de rota).
  - Layout administrativo: menu lateral (Dashboard, Clientes, Agenda, Assinaturas, Financeiro,
    Protocolos, Exames), barra superior com status da conexão, responsivo (gaveta no mobile).
  - Páginas de cada módulo criadas como estrutura visual, com estado vazio explicativo.

Nada de regra de negócio foi implementado além da fundação — os módulos começam na Fase 2.

## 4. Regras de negócio

### 4.1 Client (cliente)

- Cliente **não é excluído**: inativação via `isActive = false` + `inactivatedAt`.
- CPF é único quando informado (campo opcional, mas não pode repetir).
- A página individual do cliente centraliza: dados pessoais, agendamentos, assinaturas,
  protocolos, recomendações de exames e histórico financeiro.

### 4.2 Appointment (agendamento)

- Campos: cliente, data/hora, procedimento, profissional, valor, observações.
- Status: `AGENDADO`, `CONFIRMADO`, `REALIZADO`, `CANCELADO`, `FALTOU`.
- Guarda *snapshot* do nome do procedimento (`procedureName`) para não reescrever histórico
  quando o cadastro de procedimento mudar de nome/valor.

### 4.3 SubscriptionPlan / ClientSubscription / SubscriptionPayment

- Plano: nome, descrição, valor, periodicidade, sessões por período, ativo/inativo.
- Assinatura: cliente, plano, data inicial, data final, valor contratado, forma de pagamento,
  status (`ATIVA`, `CANCELADA`, `ENCERRADA`, `INADIMPLENTE`).
- Pagamentos da assinatura são registrados em `SubscriptionPayment`.

### 4.4 FinancialTransaction (financeiro)

- Receita com: cliente, descrição, categoria, valor, data, forma de pagamento e origem.
- Origem: `ATENDIMENTO`, `ASSINATURA`, `MANUAL`.
- Formas de pagamento: `PIX`, `DINHEIRO`, `CARTAO_CREDITO`, `CARTAO_DEBITO`, `TRANSFERENCIA`,
  `OUTRO`.
- **Regra anti-duplicidade:** um lançamento originado de atendimento guarda `appointmentId`
  (único) e um originado de pagamento de assinatura guarda `subscriptionPaymentId` (único).
  O mesmo atendimento/pagamento não pode gerar dois lançamentos. A regra é aplicada no
  **backend**, não no frontend.

### 4.5 Protocol / ProtocolSession (ficha clínica)

- Um cliente pode ter várias fichas de protocolo, cada uma com várias sessões.
- Ficha: data, título, queixa principal, avaliação, objetivo, protocolo proposto, produtos
  utilizados, orientações, evolução, observações.
- Sessão: data, procedimento realizado, produtos utilizados, parâmetros, observações, evolução.
- **Histórico é cronológico e não se sobrescreve**: sessões são registradas por acréscimo
  (append). Correção de ficha existente é permitida apenas para dados administrativos.

### 4.6 ExamRecommendation / ExamRecommendationItem

- Recomendação: cliente, data, justificativa, observação, status
  (`RECOMENDADO`, `REALIZADO`, `CANCELADO`).
- Vários exames por recomendação (itens).
- O sistema **apenas registra** uma recomendação profissional. Não há diagnóstico automático.
- A visualização deve ser limpa e servir de base para impressão/PDF no futuro.

### 4.7 Dinheiro

- Todo valor é armazenado e trafegado em **centavos (inteiro)**. Nada de `Float`.
  Conversão para exibição só na borda da interface (`formatCentsToBRL` / `parseBRLToCents`).

## 5. Entidades

`Client`, `Procedure`, `Appointment`, `SubscriptionPlan`, `ClientSubscription`,
`SubscriptionPayment`, `FinancialTransaction`, `Protocol`, `ProtocolSession`,
`ExamRecommendation`, `ExamRecommendationItem`.

Todas com `id` UUID, `createdAt` e `updatedAt`, e enums de status onde faz sentido
(detalhes dos campos em `backend/prisma/schema.prisma`).

## 6. Relacionamentos

```
Client 1─N Appointment            Appointment N─1 Procedure (opcional)
Client 1─N ClientSubscription     ClientSubscription N─1 SubscriptionPlan
ClientSubscription 1─N SubscriptionPayment
Client 1─N FinancialTransaction   FinancialTransaction N─1 Appointment (opcional, único)
                                  FinancialTransaction N─1 SubscriptionPayment (opcional, único)
Client 1─N Protocol               Protocol 1─N ProtocolSession
Client 1─N ExamRecommendation     ExamRecommendation 1─N ExamRecommendationItem
```

## 7. Endpoints principais

| Método | Rota             | Descrição                                  |
| ------ | ---------------- | ------------------------------------------ |
| GET    | `/api/health`    | Status da API e do banco                   |
| GET    | `/api/docs`      | Swagger UI                                 |
| GET    | `/api/docs-json` | Contrato OpenAPI                           |
| —      | `/api/*` (404)   | Envelope de erro padronizado               |

Endpoints de domínio (`/api/clients`, `/api/appointments`, `/api/subscriptions`,
`/api/financial`, `/api/protocols`, `/api/exams`, `/api/dashboard`) entram nas fases 2 a 9,
sempre com validação de DTO no backend.

## 8. Estrutura de pastas

```
erp-karine/
├── PROJECT.md  ARCHITECTURE.md  TASKS.md  CHANGELOG.md  README.md
├── backend/
│   ├── prisma/schema.prisma, prisma/migrations/
│   ├── prisma.config.ts          # URL do banco (Prisma 7)
│   ├── .env / .env.example
│   ├── src/
│   │   ├── main.ts, app.module.ts, app.setup.ts
│   │   ├── common/               # prisma/, filters/, not-found.module.ts
│   │   ├── health/
│   │   ├── clients/ procedures/ appointments/ subscriptions/
│   │   ├── financial/ protocols/ exams/ dashboard/
│   │   └── generated/prisma/     # cliente Prisma gerado (não versionado)
│   └── test/app.e2e-spec.ts
└── frontend/
    ├── vite.config.ts
    ├── src/
    │   ├── api/ components/ hooks/ layouts/ pages/ types/ utils/
    │   ├── App.tsx, main.tsx, index.css
```

## 9. Funcionalidades pendentes

Tudo que ainda não está implementado, em ordem de execução, está em **`TASKS.md`**.
Resumo: Fase 2 (clientes) → 3 (procedimentos) → 4 (agendamentos) → 5 (assinaturas) →
6 (financeiro) → 7 (protocolos) → 8 (exames) → 9 (dashboard) → 10 (revisão de UX,
validações, testes e documentação final).

Decisões ainda em aberto: autenticação de acesso ao sistema (não existe) e empacotamento
de deploy no CapRover (Dockerfile + volume persistente para o SQLite).

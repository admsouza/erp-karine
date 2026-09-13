# ERP Clínica (erp-karine)

Sistema de gestão da clínica: clientes, agenda, assinaturas, financeiro, protocolos clínicos e
recomendações de exames.

> **Antes de mexer no código, leia:** [`PROJECT.md`](PROJECT.md) (o que o sistema é e faz),
> [`ARCHITECTURE.md`](ARCHITECTURE.md) (decisões técnicas), [`TASKS.md`](TASKS.md) (o que vem
> agora) e [`CHANGELOG.md`](CHANGELOG.md) (o que já foi feito). O repositório é a fonte da
> verdade — não confie na memória da conversa.

## Stack

- **Frontend:** React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + React Router 7 + Axios
- **Backend:** NestJS 12 + TypeScript + REST + Swagger + class-validator
- **Banco:** SQLite + Prisma ORM 7 (driver adapter libSQL)
- **Testes:** Vitest

## Requisitos

- Node.js 22 ou superior
- npm

## Como executar (desenvolvimento)

Backend (porta 3001):

```bash
cd backend
cp .env.example .env          # na primeira vez
npm install                   # roda `prisma generate` no postinstall
npm run db:migrate            # cria/atualiza o SQLite de desenvolvimento
npm run start:dev             # http://localhost:3001/api  (docs em /api/docs)
```

Frontend (porta 5173, com proxy de `/api` para o backend):

```bash
cd frontend
cp .env.example .env          # opcional
npm install
npm run dev                   # http://localhost:5173
```

Em produção o backend serve o build do frontend (`frontend/dist`) na mesma origem:

```bash
cd frontend && npm run build
cd ../backend && npm run build && npm run start:prod
```

## Scripts úteis

| Onde      | Comando               | Para quê                                  |
| --------- | --------------------- | ----------------------------------------- |
| backend   | `npm run start:dev`   | API com reload                            |
| backend   | `npm run build`       | compila para `dist/`                      |
| backend   | `npm run test:e2e`    | testes de integração (Vitest)             |
| backend   | `npm run db:migrate`  | cria migração a partir do schema          |
| backend   | `npm run db:generate` | regenera o Prisma Client                  |
| backend   | `npm run db:studio`   | abre o Prisma Studio                      |
| frontend  | `npm run dev`         | Vite com HMR                              |
| frontend  | `npm run build`       | type-check + build de produção            |
| frontend  | `npm run lint`        | oxlint                                    |

## Convenções que não devem ser quebradas

- Dinheiro **sempre em centavos** (`Int`) no banco, na API e no estado do frontend.
- Validação de entrada no **backend** (DTO + class-validator), nunca só no frontend.
- Histórico clínico e financeiro **não é apagado**: cliente se inativa, sessão de protocolo é
  acrescentada.
- Todo endpoint novo precisa de DTO tipado e aparece no Swagger.
- Fase por fase: concluir e testar uma fase antes de começar a próxima (`TASKS.md`).

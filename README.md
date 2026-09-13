# ERP Clínica (erp-karine)

Sistema de gestão da clínica: clientes, agenda, assinaturas, financeiro, protocolos clínicos e
recomendações de exames.

> **Antes de mexer no código, leia:** [`PROJECT.md`](PROJECT.md) (o que o sistema é e faz),
> [`ARCHITECTURE.md`](ARCHITECTURE.md) (arquitetura, camadas e regras de dependência),
> [`MODULES.md`](MODULES.md) (contrato de cada módulo — consulte antes de criar ou alterar
> um módulo), [`TASKS.md`](TASKS.md) (o que vem agora) e [`CHANGELOG.md`](CHANGELOG.md)
> (o que já foi feito). O repositório é a fonte da verdade — não confie na memória da
> conversa.

## Stack

- **Frontend:** React 19 + TypeScript + Vite 8 + Tailwind CSS 4 + React Router 7 + Axios
- **Backend:** NestJS 12 + TypeScript + REST + Swagger + class-validator
- **Banco:** PostgreSQL + Prisma ORM 7 (driver adapter `pg`)
- **Testes:** Vitest

## Requisitos

- Node.js 22 ou superior
- npm
- Um PostgreSQL acessível (produção: `srv-captain--postgresql` no CapRover; local: o host que
  sua máquina alcança). A conexão vai em `DATABASE_URL`.

## Como executar (desenvolvimento)

Backend (porta 3001):

```bash
cd backend
cp .env.example .env          # na primeira vez
npm install                   # roda `prisma generate` no postinstall
npm run db:migrate            # cria/atualiza o PostgreSQL de desenvolvimento
npm run start:dev             # http://localhost:3001/api  (docs em /api/docs)
```

Frontend (porta 5173, com proxy de `/api` para o backend):

```bash
cd frontend
cp .env.example .env          # opcional
npm install
npm run dev                   # http://localhost:5173
```

Em produção o build é servido pelo próprio backend (`frontend/dist`), em um único container:

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

## Arquitetura em uma frase

Monólito modular: cada domínio é um módulo independente (`backend/src/modules/<dominio>` +
`frontend/src/features/<dominio>`) que encapsula suas regras e o acesso às suas tabelas e
expõe apenas um contrato público. Um módulo **nunca** lê dados de outro módulo diretamente —
usa o serviço público do dono (ou reage a um evento de domínio).

## Convenções que não devem ser quebradas

- Dinheiro **sempre em centavos** (`Int`) no banco, na API e no estado do frontend.
- Validação de entrada no **backend** (DTO + class-validator), nunca só no frontend.
- Histórico clínico e financeiro **não é apagado**: cliente se inativa, sessão de protocolo é
  acrescentada.
- Todo endpoint novo precisa de DTO tipado e aparece no Swagger.
- Fase por fase: concluir e testar uma fase antes de começar a próxima (`TASKS.md`).

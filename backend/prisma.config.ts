import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Configuração da CLI do Prisma (v7).
 *
 * A URL vem de DATABASE_URL quando definida (app rodando, .env local ou env var do
 * container). O fallback existe só para comandos que não precisam de banco de verdade —
 * em especial `prisma generate` dentro do build da imagem, onde a variável não existe.
 * Em produção o container sempre define DATABASE_URL (a aplicação recusa subir sem ela).
 */
const FALLBACK_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/erp_estetica';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL?.trim() || FALLBACK_DATABASE_URL,
  },
});

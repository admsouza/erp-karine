#!/bin/sh
# Entrypoint do container: aplica as migrações pendentes e sobe a API.
# A aplicação escuta em 0.0.0.0 (padrão do Nest) na porta $PORT.
set -e

if [ -z "${DATABASE_URL}" ]; then
  echo "[entrypoint] ERRO: DATABASE_URL não definida." >&2
  exit 1
fi
echo "[entrypoint] banco: ${DATABASE_URL}"

echo "[entrypoint] aplicando migrações (prisma migrate deploy)..."
npx prisma migrate deploy

echo "[entrypoint] iniciando API na porta ${PORT:-3001}..."
exec node dist/main.js

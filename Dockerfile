# =============================================================================
# ERP Clínica — imagem única: build do frontend + API NestJS servindo os dois
# =============================================================================

# ---------------------------- frontend (build) -------------------------------
FROM node:22-bookworm-slim AS frontend-build
RUN npm install --global npm@12.0.2
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------------------------- backend (build) --------------------------------
FROM node:22-bookworm-slim AS backend-build
RUN npm install --global npm@12.0.2
WORKDIR /build/backend
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --ignore-scripts
COPY backend/ ./
RUN npx prisma generate && npm run build

# ------------------------------- runtime ------------------------------------
FROM node:22-bookworm-slim AS runtime

RUN npm install --global npm@12.0.2

# openssl é exigido pelo engine do Prisma CLI; tini cuida do PID 1 e do SIGTERM
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates tini \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3001 \
    FRONTEND_DIST=/app/public

WORKDIR /app

# dependências de produção (sem scripts: o cliente Prisma já vem compilado em dist/)
COPY backend/package.json backend/package-lock.json ./
COPY backend/prisma ./prisma
RUN npm ci --omit=dev --ignore-scripts

COPY backend/prisma.config.ts ./
COPY --from=backend-build /build/backend/dist ./dist
COPY --from=frontend-build /build/frontend/dist ./public
COPY backend/docker-entrypoint.sh ./docker-entrypoint.sh

# A aplicação não escreve em disco: o banco é PostgreSQL (fora do container).
RUN chmod +x ./docker-entrypoint.sh && chown -R node:node /app

USER node
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/bin/tini", "--", "./docker-entrypoint.sh"]

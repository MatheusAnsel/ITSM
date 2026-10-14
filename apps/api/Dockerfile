# syntax=docker/dockerfile:1
# Contexto de build: a RAIZ do repositório (monorepo). Ex.: docker build -f apps/api/Dockerfile .

FROM node:24-bookworm-slim AS base
# O Prisma precisa do OpenSSL em tempo de execução.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Os package.json de todos os workspaces são necessários para o npm validar o package-lock.
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

# ---- compila a API (com dependências de desenvolvimento) ----
FROM base AS build
RUN npm ci --workspace apps/api
COPY apps/api apps/api
RUN npm run db:generate && npm run build -w apps/api

# ---- dependências de produção ----
FROM base AS deps
RUN npm ci --omit=dev --workspace apps/api

# ---- imagem final: só o necessário para rodar, sem root ----
FROM base AS runtime
ENV NODE_ENV=production \
    PORT=3001 \
    UPLOAD_DIR=/data/uploads
COPY --from=deps /app/node_modules ./node_modules
# Traz package.json e, se o npm não conseguiu elevar alguma dependência, apps/api/node_modules.
COPY --from=deps /app/apps/api ./apps/api
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma
COPY apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh
WORKDIR /app/apps/api
RUN npx prisma generate \
 && mkdir -p /data/uploads \
 && chown -R node:node /data /app
USER node
EXPOSE 3001
VOLUME ["/data/uploads"]
HEALTHCHECK --interval=15s --timeout=3s --start-period=30s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
ENTRYPOINT ["sh", "./docker-entrypoint.sh"]

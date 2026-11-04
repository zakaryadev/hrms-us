# Context: repo root.  docker build -f apps/api/Dockerfile .
FROM node:22-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api
COPY apps/api apps/api
RUN npx -w apps/api prisma generate && npm run build -w apps/api

FROM node:22-slim
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production \
    PORT=3000 \
    UPLOAD_DIR=/data/uploads \
    GENERATED_DIR=/data/generated
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci -w apps/api --omit=dev
COPY apps/api/prisma apps/api/prisma
RUN npx -w apps/api prisma generate
COPY --from=build /app/apps/api/dist apps/api/dist
COPY apps/api/templates apps/api/templates
RUN mkdir -p /data/uploads /data/generated && chown -R node:node /data
WORKDIR /app/apps/api
USER node
EXPOSE 3000
VOLUME ["/data/uploads", "/data/generated"]
# Миграциялар автоматик қўлланади, сўнг сервер ишга тушади
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]

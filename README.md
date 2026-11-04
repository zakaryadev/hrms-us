# HRMS — Kadrlar bo'limi boshqaruv tizimi

Monorepo: `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Vite + React + Tailwind).

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run dev:api
npm run dev:web
```

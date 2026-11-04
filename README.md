# HRMS — Kadrlar bo'limi boshqaruv tizimi

Monorepo: `apps/api` (NestJS + Prisma + PostgreSQL), `apps/web` (Vite + React + Tailwind).

```bash
cp .env.example .env
docker compose up -d db
npm install
npm run dev:api
npm run dev:web
```

## Ma'lumotlar bazasi
```bash
cd apps/api
npx prisma migrate dev     # migratsiyalar
npm run prisma:seed        # namunaviy ma'lumot
```

## API (prefiks `/api`)
`departments`, `positions`, `employees` (CRUD, `?q=&departmentId=&status=&page=&pageSize=`),
`POST employees/import` — Excel (`file` maydoni). Ustunlar: Tabel raqami, Familiya, Ism, Otasining ismi,
Tug'ilgan sana, Jinsi, Millati, Telefon, Manzil, JSHSHIR, Pasport, Bo'lim, Lavozim, Turi, Ishga qabul sanasi, Oylik.

## Hujjatlar (DOCX)
Shablonlar `apps/api/templates/*.docx` (teglar `{{o'zgaruvchi}}`, tsikllar `{{#royxat}}…{{/royxat}}`).
O'zingizning shabloningiz bilan almashtirishingiz mumkin (o'zgaruvchi nomlari `apps/api/scripts/build-templates.ts` da).
Namunaviy shablonlarni qayta yaratish: `cd apps/api && npx ts-node scripts/build-templates.ts`.
Tashkilot rekvizitlari: UI → Sozlamalar. Bayramlar: `apps/api/src/calendar/holidays.ts` (hayit sanalarini yil boshida tekshiring).

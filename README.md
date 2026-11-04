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

## Tabel va oylik
UI → Tabel. Kodlar: `8`, `7.2` (ishlangan), `MT`, `KV` (50%), `BPT`, `SK`, `TSH`, `TK` (ogohlantirish, kun ishlangan hisoblanadi).
Hisob: `apps/api/src/payroll/payroll.ts` (yagona manba). Shtat: ishlangan × kunlik + KV × kunlik × 0.5 (oikladdan oshmaydi);
GPX: ishlangan × kunlik, 100 so'mgacha yaxlitlanadi. `GET /api/timesheet/export?year=&month=` — Excel.

## Til
Интерфейс — ўзбек кирилл. DOCX ҳужжатлар икки тилда: `templates/cyr` ва `templates/lat` (ҳужжат яратишда тил танланади, API: `params.lang = 'cyr' | 'lat'`).

## Ишга тушириш (production, Docker)
```bash
cp .env.prod.example .env.prod      # POSTGRES_PASSWORD, JWT_SECRET ни алмаштиринг (openssl rand -hex 32)
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```
- Сайт: `http://<сервер>:8080` (`WEB_PORT`). HTTPS орқасида бўлса `COOKIE_SECURE=true` қўйинг (акс ҳолда cookie ўрнатилмайди).
- Биринчи очилишда **созлаш устаси** чиқади: Суперадмин ва ташкилот маълумотлари киритилади. Кейин Суперадмин «Фойдаланувчилар» бўлимидан Кадрлар/Бухгалтер ҳисобларини қўшади (икковининг ҳуқуқи бир хил).
- Маълумотлар volume’ларда: `pgdata` (база), `uploads` (ходим ҳужжатлари), `generated` (яратилган DOCX). Захира: `docker compose -f docker-compose.prod.yml exec db pg_dump -U hrms hrms > backup.sql` ва uploads/generated volume’ларни нусхалаш.
- Миграциялар API ишга тушганда автоматик қўлланади (`prisma migrate deploy`).

## Хавфсизлик
- JWT `httpOnly` cookie (`SameSite=Lax`), 12 соат. `JWT_SECRET` productionда мажбурий.
- Логинда 5 та хато уринишдан кейин 15 дақиқа блок (login+IP бўйича). Охирги фаол Суперадминни ўчириб бўлмайди.
- Рол: `superadmin` (+ фойдаланувчилар), `kadrlar` ва `buxgalter` (бир хил ҳуқуқ).

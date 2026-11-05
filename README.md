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
Tashkilot rekvizitlari: UI → Sozlamalar. Bayramlar va ish kunlari: UI → «Иш календари» (kodni o'zgartirish shart emas).

## Tabel va oylik
UI → Tabel. Kodlar: `8`, `7.2` (ishlangan), `MT`, `KV` (50%), `BPT`, `SK`, `TSH`, `TK` (ogohlantirish, kun ishlangan hisoblanadi).
Hisob: `apps/api/src/payroll/payroll.ts` (yagona manba). Shtat: ishlangan × kunlik + KV × kunlik × 0.5 (oikladdan oshmaydi);
GPX: ishlangan × kunlik, 100 so'mgacha yaxlitlanadi. `GET /api/timesheet/export?year=&month=` — Excel.

## Til
Интерфейс — ўзбек кирилл. DOCX ҳужжатлар икки тилда: `templates/cyr` ва `templates/lat` (ҳужжат яратишда тил танланади, API: `params.lang = 'cyr' | 'lat'`).

## Серверга жойлаш (Ubuntu/Debian, Docker)
Серверда (root ёки sudo):
```bash
git clone <repo-url> /opt/hrms && cd /opt/hrms
sudo DOMAIN=hrms.example.uz ./scripts/deploy.sh     # HTTPS (Caddy, сертификат автоматик)
# ёки домен йўқ бўлса (фақат синов/ички тармоқ):  sudo ./scripts/deploy.sh   →  http://<server-ip>:8080
```
Скрипт: Docker’ни ўрнатади (йўқ бўлса), `.env.prod` ни тасодифий паролларда яратади (мавжудини **босмайди**, `chmod 600`), `ufw` фаол бўлса керакли портларни очади, контейнерларни build қилиб ишга туширади ва API тайёр бўлишини кутади. Қайта ишга туширса хавфсиз: маълумотлар volume’ларда қолади.
- **DNS**: `DOMAIN` учун A-ёзув сервер IP’сига йўналтирилган ва 80/443 очиқ бўлиши керак (сертификат биринчи киришда олинади).
- Биринчи очилишда **созлаш устаси** чиқади (Суперадмин ва ташкилот маълумотлари).
- **Янгилаш**: `cd /opt/hrms && sudo ./scripts/deploy.sh` (`git pull` ни ўзи қилади; `NO_PULL=1` билан ўчирилади).
- **Лог**: `docker compose -f docker-compose.prod.yml logs -f api` (HTTPS режимида `-f docker-compose.caddy.yml` ҳам қўшилади).
- Қўлда (скриптсиз): `cp .env.prod.example .env.prod`, қийматларни алмаштиринг, сўнг `docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build` (HTTPS учун иккинчи `-f docker-compose.caddy.yml` ва `DOMAIN`, `COOKIE_SECURE=true`).

### Захира нусха ва тиклаш
```bash
sudo ./scripts/backup.sh                      # /var/backups/hrms: db-*.sql.gz + files-*.tar.gz (охирги 14 таси сақланади)
# cron (ҳар куни 03:15):  15 3 * * *  cd /opt/hrms && ./scripts/backup.sh >> /var/log/hrms-backup.log 2>&1
```
Тиклаш (HTTP режими; HTTPS да иккинчи `-f docker-compose.caddy.yml` қўшилади):
```bash
C="docker compose -f docker-compose.prod.yml --env-file .env.prod"
$C stop api
gunzip -c /var/backups/hrms/db-<сана>.sql.gz | $C exec -T db psql -U hrms hrms
$C exec -T api sh -c 'tar -C /data -xzf -' < /var/backups/hrms/files-<сана>.tar.gz
$C start api
```
Захирани **бошқа серверга/дискка** ҳам нусхалаб туринг; `.env.prod` (JWT_SECRET, POSTGRES_PASSWORD) ни алоҳида хавфсиз жойда сақланг.

### Сервер хавфсизлиги (тавсия)
- Root паролини **алмаштиринг** (айниқса у чат/хабарда очиқ ёзилган бўлса), SSH калитига ўтиб, `PasswordAuthentication no` қилинг; `ufw allow 22,80,443/tcp && ufw enable` (скрипт `ufw` ни ўзи ёқмайди — SSH’дан чиқиб кетмаслик учун).
- Server vaqtini (`timedatectl`) ва автоматик хавфсизлик янгиланишларини (`unattended-upgrades`) текширинг.

## Хавфсизлик
- JWT `httpOnly` cookie (`SameSite=Lax`), 12 соат. `JWT_SECRET` productionда мажбурий.
- Логинда 5 та хато уринишдан кейин 15 дақиқа блок (login+IP бўйича). Охирги фаол Суперадминни ўчириб бўлмайди.
- Роллар: `superadmin` — ҳамма нарса (фойдаланувчилар, справочниклар/созламалар, ходимни бутунлай ўчириш, журнал); `kadrlar` — кадрлар иши (ходимлар, ҳужжатлар, буйруқлар, штат, календарь, табель), лекин созламалар ва ходимни бутунлай ўчириш йўқ; `buxgalter` — ҳамма жойни кўради, фақат табелни ўзгартиради.
- **Шаблонлар**: «Ҳужжатлар → Шаблонлар» саҳифасидан Word шаблонни юклаб олиш, ўзингизнинг стандарт шаблонингизни юклаш (фақат суперадмин) ва стандартга қайтариш (олдинги версия сақланади — «Олдинги» тугмаси билан тикланади) мумкин. **Битта шаблон юклаш етарли**: ёзуви (кирилл/лотин) автоматик аниқланади, ҳужжат кирилл, лотин ёки янги алифбода яратилганда бутун матн (шаблон матни ҳам, маълумот ҳам) ўзи ўгирилади; форматлаш, жадвал ва расм сақланади.
- **Word файлни ўгириш**: «Транслитератор» саҳифасида (ёки `POST /api/translit/docx`, `file`+`to`) исталган .docx нинг бутун матнини кирилл/лотин/янги алифбога ўгириш мумкин. Юкланган шаблонлар alohida `templates` volume'да (`/data/templates`) сақланади ва zaxira nusxaga киради; деплойда йўқолмайди.
- **DOCX файл номи**: `12_Muratbayev_Zakarya_Baxtiyar_uli_“Ijro_gov_uz”_menejer.docx` — табель №, Ф.И.Ш. (лотин), бўлим номидаги «қўштирноқ» қисм, лавозимнинг сўнгги сўзи. Т-2 дан бошқа ҳужжатларга тури ва рақами қўшилади (`…_buyruq-tatil-T-3.docx`).
- **Транслитератор** (`/translit`): кирилл ⇄ лотин (1995) ⇄ янги лотин алифбоси (Oʻ→Ö, Gʻ→Ğ, Sh→Ş, Ch→Ç). API: `POST /api/translit {text, to: cyr|lat|lat-new}`.
- **Журнал** (`/audit`, фақат суперадмин): барча ўзгартирувчи амаллар (ким, қачон, нима, IP) ва муваффақиятсиз киришлар. Парол ва сўров танаси ёзилмайди. Эски ёзувлар `AUDIT_RETENTION_DAYS` (одатда 730 кун; 0 — тозаламаслик) дан кейин автоматик ўчади.
- Буйруқ рақами бир йил ичида базада ҳам noyob (`orders_number_year_key`). Эски маълумотда дубликат бўлса, миграция индексни яратмай огоҳлантириш беради — дубликатларни тозалаб индексни қўлда яратинг.
- Ходимни бутунлай ўчириш фақат суперадмин учун; буйруғи бор ходим ўчмайди — «Архив»га ўтказинг.

## Иш календари
UI → «Иш календари». Йил бўйича кунларни белгилаш мумкин (Суперадмин талаб қилинмайди):
- **Расмий байрам** — иш куни эмас, таътил оралиғига тушса таътилни узайтиради (ҳайит кунлари ҳар йили ҳукумат қарори бўйича киритилади);
- **Кўчирилган дам олиш куни** — иш куни эмас, лекин таътилни узайтирмайди;
- **Иш куни** — масалан, ишчи шанба ёки ишчи деб белгиланган байрам.

Белгиланган кунлар таътил калькулятори, табель (иш кунлари) ва ойлик ҳисобига дарҳол таъсир қилади. Ўрнатилган байрамлар (1.01, 8.03, 21.03, 9.05, 1.09, 1.10, 8.12) ва 2026 ҳайит кунлари `apps/api/src/calendar/holidays.ts` да; ҳайит жадвали йўқ йил учун огоҳлантириш чиқади.

## Таътил буйруғи → табель
Таътил буйруғи **сақланганда** (чекбокс ёқиқ) таътил оралиғидаги иш кунларига табелда «MT» автоматик қўйилади. Бўш катак ва «8»/«7.2» алмаштирилади; KV, BPT, TSH, SK, TK сақланади. Бош саҳифадаги «Таътилдагилар» бугунги сана буйруқ оралиғига тушган ходимларни ҳам санайди.

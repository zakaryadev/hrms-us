-- Журнал: ҳолатлар enum, рўйхатлар жадвали (id орқали боғлаш), ҳолатлар тарихи.
-- Мавжуд маълумот сақланади: матнли қийматлар рўйхат элементларига, ҳолатлар enum'га ўтказилади.

-- CreateEnum
CREATE TYPE "JournalOptionKind" AS ENUM ('work_type', 'channel', 'priority', 'client_group', 'training_format', 'category', 'kb_type');
CREATE TYPE "TicketStatus" AS ENUM ('registered', 'in_progress', 'forwarded', 'resolved', 'cancelled');
CREATE TYPE "KbStatus" AS ENUM ('draft', 'active', 'needs_update', 'archived');

-- CreateTable
CREATE TABLE "journal_options" (
    "id" TEXT NOT NULL,
    "kind" "JournalOptionKind" NOT NULL,
    "label_lat" TEXT NOT NULL,
    "label_cyr" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "journal_options_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "journal_options_kind_label_lat_key" ON "journal_options"("kind", "label_lat");
CREATE INDEX "journal_options_kind_sort_idx" ON "journal_options"("kind", "sort");

-- Бошланғич рўйхатлар

INSERT INTO "journal_options" ("id","kind","label_lat","sort") VALUES
  (gen_random_uuid()::text, 'work_type', 'Texnik yordam', 10),
  (gen_random_uuid()::text, 'work_type', 'Maslahat', 20),
  (gen_random_uuid()::text, 'work_type', 'Monitoring', 30),
  (gen_random_uuid()::text, 'work_type', 'O‘qitish', 40),
  (gen_random_uuid()::text, 'work_type', 'Eskalatsiya', 50),
  (gen_random_uuid()::text, 'work_type', 'Bilimlar bazasi', 60),
  (gen_random_uuid()::text, 'work_type', 'Hisobot', 70),
  (gen_random_uuid()::text, 'work_type', 'Boshqa', 80)
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort") VALUES
  (gen_random_uuid()::text, 'channel', 'Telefon', 10),
  (gen_random_uuid()::text, 'channel', 'Telegram', 20),
  (gen_random_uuid()::text, 'channel', 'Elektron pochta', 30),
  (gen_random_uuid()::text, 'channel', 'Shaxsan', 40),
  (gen_random_uuid()::text, 'channel', 'Ichki topshiriq', 50),
  (gen_random_uuid()::text, 'channel', 'Boshqa', 60)
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort") VALUES
  (gen_random_uuid()::text, 'priority', 'Past', 10),
  (gen_random_uuid()::text, 'priority', 'O‘rta', 20),
  (gen_random_uuid()::text, 'priority', 'Yuqori', 30),
  (gen_random_uuid()::text, 'priority', 'Shoshilinch', 40)
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort") VALUES
  (gen_random_uuid()::text, 'client_group', '№3', 10),
  (gen_random_uuid()::text, 'client_group', '№4', 20)
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort") VALUES
  (gen_random_uuid()::text, 'training_format', 'Yuzma-yuz', 10),
  (gen_random_uuid()::text, 'training_format', 'Onlayn', 20),
  (gen_random_uuid()::text, 'training_format', 'Telefon orqali', 30),
  (gen_random_uuid()::text, 'training_format', 'Individual maslahat', 40),
  (gen_random_uuid()::text, 'training_format', 'Guruhli mashg‘ulot', 50)
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort") VALUES
  (gen_random_uuid()::text, 'category', 'Tizimga kirish', 10),
  (gen_random_uuid()::text, 'category', 'ERI / imzolash', 20),
  (gen_random_uuid()::text, 'category', 'Hujjat yuborish', 30),
  (gen_random_uuid()::text, 'category', 'Hujjat holati', 40),
  (gen_random_uuid()::text, 'category', 'Rollar / huquqlar', 50),
  (gen_random_uuid()::text, 'category', 'Texnik xatolik', 60),
  (gen_random_uuid()::text, 'category', 'Foydalanish bo‘yicha savol', 70),
  (gen_random_uuid()::text, 'category', 'Boshqa', 80)
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort") VALUES
  (gen_random_uuid()::text, 'kb_type', 'Savol-javob', 10),
  (gen_random_uuid()::text, 'kb_type', 'Yo‘riqnoma', 20),
  (gen_random_uuid()::text, 'kb_type', 'Qo‘llanma', 30),
  (gen_random_uuid()::text, 'kb_type', 'Video', 40),
  (gen_random_uuid()::text, 'kb_type', 'Taqdimot', 50)
ON CONFLICT DO NOTHING;

-- Эски матнли қийматлар (рўйхатда бўлмаганлари) элемент сифатида қўшилади

INSERT INTO "journal_options" ("id","kind","label_lat","sort")
SELECT gen_random_uuid()::text, 'work_type', v, 1000 FROM (SELECT DISTINCT "type" AS v FROM journal_entries WHERE "type" <> '') s
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort")
SELECT gen_random_uuid()::text, 'channel', v, 1000 FROM (SELECT DISTINCT "channel" AS v FROM journal_tickets WHERE "channel" <> '' UNION SELECT DISTINCT "channel" AS v FROM journal_entries WHERE "channel" <> '') s
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort")
SELECT gen_random_uuid()::text, 'priority', v, 1000 FROM (SELECT DISTINCT "priority" AS v FROM journal_tickets WHERE "priority" <> '') s
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort")
SELECT gen_random_uuid()::text, 'client_group', v, 1000 FROM (SELECT DISTINCT "group" AS v FROM journal_tickets WHERE "group" <> '' UNION SELECT DISTINCT "group" AS v FROM journal_orgs WHERE "group" <> '') s
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort")
SELECT gen_random_uuid()::text, 'training_format', v, 1000 FROM (SELECT DISTINCT "format" AS v FROM journal_trainings WHERE "format" <> '') s
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort")
SELECT gen_random_uuid()::text, 'category', v, 1000 FROM (SELECT DISTINCT "category" AS v FROM journal_tickets WHERE "category" <> '' UNION SELECT DISTINCT "category" AS v FROM journal_kb WHERE "category" <> '') s
ON CONFLICT DO NOTHING;

INSERT INTO "journal_options" ("id","kind","label_lat","sort")
SELECT gen_random_uuid()::text, 'kb_type', v, 1000 FROM (SELECT DISTINCT "type" AS v FROM journal_kb WHERE "type" <> '') s
ON CONFLICT DO NOTHING;


-- ===== Ташкилотлар: гуруҳ → рўйхат элементи =====
ALTER TABLE "journal_orgs" ADD COLUMN "group_id" TEXT;
-- Ташкилотда гуруҳ бўш, лекин мурожаатида кўрсатилган бўлса — энг кўп учрагани ташкилотга ўтказилади
UPDATE "journal_orgs" o SET "group" = t.g FROM (
  SELECT DISTINCT ON (org_id) org_id, "group" AS g FROM journal_tickets WHERE "group" <> '' AND org_id IS NOT NULL
  GROUP BY org_id, "group" ORDER BY org_id, COUNT(*) DESC
) t WHERE o.id = t.org_id AND o."group" = '';
UPDATE "journal_orgs" o SET "group_id" = p.id FROM "journal_options" p WHERE p.kind = 'client_group' AND p.label_lat = o."group";
ALTER TABLE "journal_orgs" DROP COLUMN "group";

-- ===== Мурожаатлар =====
ALTER TABLE "journal_tickets" ADD COLUMN "channel_id" TEXT, ADD COLUMN "category_id" TEXT, ADD COLUMN "priority_id" TEXT,
  ADD COLUMN "status_new" "TicketStatus" NOT NULL DEFAULT 'registered';
UPDATE "journal_tickets" t SET "channel_id" = p.id FROM "journal_options" p WHERE p.kind = 'channel' AND p.label_lat = t."channel";
UPDATE "journal_tickets" t SET "category_id" = p.id FROM "journal_options" p WHERE p.kind = 'category' AND p.label_lat = t."category";
UPDATE "journal_tickets" t SET "priority_id" = p.id FROM "journal_options" p WHERE p.kind = 'priority' AND p.label_lat = t."priority";
UPDATE "journal_tickets" SET "status_new" = CASE "status"
  WHEN 'Jarayonda' THEN 'in_progress'::"TicketStatus"
  WHEN 'Boshqa bo‘limga yuborildi' THEN 'forwarded'::"TicketStatus"
  WHEN 'Hal qilindi' THEN 'resolved'::"TicketStatus"
  WHEN 'Bekor qilindi' THEN 'cancelled'::"TicketStatus"
  ELSE 'registered'::"TicketStatus" END;
ALTER TABLE "journal_tickets" DROP COLUMN "status", DROP COLUMN "channel", DROP COLUMN "category", DROP COLUMN "priority", DROP COLUMN "group", DROP COLUMN "replied";
ALTER TABLE "journal_tickets" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "journal_tickets" RENAME COLUMN "resolved" TO "resolved_at";
CREATE INDEX "journal_tickets_status_idx" ON "journal_tickets"("status");
-- «Ҳал қилинди» бўлмаганда ҳал этилган сана маъноси йўқ
UPDATE "journal_tickets" SET "resolved_at" = NULL WHERE "status" <> 'resolved';

-- ===== Ҳолатлар тарихи =====
CREATE TABLE "journal_ticket_events" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by_id" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    CONSTRAINT "journal_ticket_events_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "journal_ticket_events_ticket_id_at_idx" ON "journal_ticket_events"("ticket_id", "at");
CREATE INDEX "journal_ticket_events_at_idx" ON "journal_ticket_events"("at");
-- Тарих: рўйхатга олиш (қабул санаси) ва жорий ҳолат (ҳал қилинган бўлса — ҳал этилган сана)
INSERT INTO "journal_ticket_events" ("id","ticket_id","status","at","by_id")
  SELECT gen_random_uuid()::text, id, 'registered', GREATEST(received::timestamp, '1970-01-01'), created_by_id FROM "journal_tickets";
INSERT INTO "journal_ticket_events" ("id","ticket_id","status","at","by_id")
  SELECT gen_random_uuid()::text, id, status,
         GREATEST(COALESCE(resolved_at::timestamp, updated_at), received::timestamp + interval '1 second'), created_by_id
  FROM "journal_tickets" WHERE status <> 'registered';

-- ===== Кундалик ишлар =====
ALTER TABLE "journal_entries" ADD COLUMN "type_id" TEXT, ADD COLUMN "channel_id" TEXT;
UPDATE "journal_entries" e SET "type_id" = p.id FROM "journal_options" p WHERE p.kind = 'work_type' AND p.label_lat = e."type";
UPDATE "journal_entries" e SET "channel_id" = p.id FROM "journal_options" p WHERE p.kind = 'channel' AND p.label_lat = e."channel";
-- «Мазмун» ва «Бажарилган иш» бирлаштирилади (мазмун йўқолмайди)
UPDATE "journal_entries" SET "done" = CASE
  WHEN "content" <> '' AND "done" <> '' THEN "content" || E'\n' || "done"
  WHEN "content" <> '' THEN "content" ELSE "done" END;
ALTER TABLE "journal_entries" DROP COLUMN "type", DROP COLUMN "channel", DROP COLUMN "content", DROP COLUMN "status", DROP COLUMN "next", DROP COLUMN "partner", DROP COLUMN "note";

-- ===== Ўқитиш =====
ALTER TABLE "journal_trainings" ADD COLUMN "format_id" TEXT;
UPDATE "journal_trainings" t SET "format_id" = p.id FROM "journal_options" p WHERE p.kind = 'training_format' AND p.label_lat = t."format";
ALTER TABLE "journal_trainings" DROP COLUMN "format";

-- ===== Билимлар базаси =====
ALTER TABLE "journal_kb" ADD COLUMN "category_id" TEXT, ADD COLUMN "type_id" TEXT, ADD COLUMN "status_new" "KbStatus" NOT NULL DEFAULT 'draft';
UPDATE "journal_kb" k SET "category_id" = p.id FROM "journal_options" p WHERE p.kind = 'category' AND p.label_lat = k."category";
UPDATE "journal_kb" k SET "type_id" = p.id FROM "journal_options" p WHERE p.kind = 'kb_type' AND p.label_lat = k."type";
UPDATE "journal_kb" SET "status_new" = CASE "status"
  WHEN 'Amalda' THEN 'active'::"KbStatus" WHEN 'Yangilanish kerak' THEN 'needs_update'::"KbStatus"
  WHEN 'Arxiv' THEN 'archived'::"KbStatus" ELSE 'draft'::"KbStatus" END;
ALTER TABLE "journal_kb" DROP COLUMN "category", DROP COLUMN "type", DROP COLUMN "status";
ALTER TABLE "journal_kb" RENAME COLUMN "status_new" TO "status";

-- Эски рўйхатлар созламаси (энди journal_options)
DELETE FROM "settings" WHERE "key" = 'journal.lists';

-- ===== Ташқи калитлар =====
ALTER TABLE "journal_orgs" ADD CONSTRAINT "journal_orgs_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "journal_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_tickets" ADD CONSTRAINT "journal_tickets_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "journal_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_tickets" ADD CONSTRAINT "journal_tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "journal_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_tickets" ADD CONSTRAINT "journal_tickets_priority_id_fkey" FOREIGN KEY ("priority_id") REFERENCES "journal_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_ticket_events" ADD CONSTRAINT "journal_ticket_events_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "journal_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "journal_ticket_events" ADD CONSTRAINT "journal_ticket_events_by_id_fkey" FOREIGN KEY ("by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "journal_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "journal_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_trainings" ADD CONSTRAINT "journal_trainings_format_id_fkey" FOREIGN KEY ("format_id") REFERENCES "journal_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_kb" ADD CONSTRAINT "journal_kb_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "journal_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "journal_kb" ADD CONSTRAINT "journal_kb_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "journal_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

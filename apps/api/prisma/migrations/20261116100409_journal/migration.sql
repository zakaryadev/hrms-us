-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'operator';
ALTER TYPE "UserRole" ADD VALUE 'rahbar';

-- CreateTable
CREATE TABLE "journal_orgs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT '',
    "group" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_tickets" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "received" DATE NOT NULL,
    "org_id" TEXT,
    "group" TEXT NOT NULL DEFAULT '',
    "person" TEXT NOT NULL DEFAULT '',
    "channel" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "priority" TEXT NOT NULL DEFAULT '',
    "problem" TEXT NOT NULL,
    "actions" TEXT NOT NULL DEFAULT '',
    "dept" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'Yangi',
    "resolved" DATE,
    "replied" BOOLEAN,
    "note" TEXT NOT NULL DEFAULT '',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "start" TEXT NOT NULL DEFAULT '',
    "end" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "org_id" TEXT,
    "ticket_id" TEXT,
    "person" TEXT NOT NULL DEFAULT '',
    "channel" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '',
    "done" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "next" TEXT NOT NULL DEFAULT '',
    "partner" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_trainings" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "org_id" TEXT,
    "topic" TEXT NOT NULL,
    "format" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 0,
    "ticket_id" TEXT,
    "link" TEXT NOT NULL DEFAULT '',
    "trainer" TEXT NOT NULL DEFAULT '',
    "result" TEXT NOT NULL DEFAULT '',
    "note" TEXT NOT NULL DEFAULT '',
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_kb" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "created" DATE NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL DEFAULT '',
    "question" TEXT NOT NULL,
    "solution" TEXT NOT NULL DEFAULT '',
    "ticket_id" TEXT,
    "link" TEXT NOT NULL DEFAULT '',
    "version" TEXT NOT NULL DEFAULT '1.0',
    "status" TEXT NOT NULL DEFAULT 'Loyiha',
    "review" DATE,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_kb_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "journal_orgs_name_key_key" ON "journal_orgs"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "journal_tickets_code_key" ON "journal_tickets"("code");

-- CreateIndex
CREATE INDEX "journal_tickets_received_idx" ON "journal_tickets"("received");

-- CreateIndex
CREATE INDEX "journal_tickets_status_idx" ON "journal_tickets"("status");

-- CreateIndex
CREATE INDEX "journal_tickets_org_id_idx" ON "journal_tickets"("org_id");

-- CreateIndex
CREATE INDEX "journal_entries_date_idx" ON "journal_entries"("date");

-- CreateIndex
CREATE INDEX "journal_entries_ticket_id_idx" ON "journal_entries"("ticket_id");

-- CreateIndex
CREATE INDEX "journal_entries_org_id_idx" ON "journal_entries"("org_id");

-- CreateIndex
CREATE INDEX "journal_trainings_date_idx" ON "journal_trainings"("date");

-- CreateIndex
CREATE INDEX "journal_trainings_org_id_idx" ON "journal_trainings"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "journal_kb_code_key" ON "journal_kb"("code");

-- CreateIndex
CREATE INDEX "journal_kb_created_idx" ON "journal_kb"("created");

-- AddForeignKey
ALTER TABLE "journal_tickets" ADD CONSTRAINT "journal_tickets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "journal_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_tickets" ADD CONSTRAINT "journal_tickets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "journal_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "journal_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_trainings" ADD CONSTRAINT "journal_trainings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "journal_orgs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_trainings" ADD CONSTRAINT "journal_trainings_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "journal_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_trainings" ADD CONSTRAINT "journal_trainings_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_kb" ADD CONSTRAINT "journal_kb_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "journal_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_kb" ADD CONSTRAINT "journal_kb_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

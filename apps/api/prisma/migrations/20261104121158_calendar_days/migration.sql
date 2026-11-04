-- CreateEnum
CREATE TYPE "CalendarKind" AS ENUM ('holiday', 'dayoff', 'workday');

-- CreateTable
CREATE TABLE "calendar_days" (
    "date" DATE NOT NULL,
    "kind" "CalendarKind" NOT NULL,
    "note" TEXT,

    CONSTRAINT "calendar_days_pkey" PRIMARY KEY ("date")
);

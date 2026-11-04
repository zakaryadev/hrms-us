-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('erkak', 'ayol');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('shtat', 'gpx');

-- CreateEnum
CREATE TYPE "ContractDurationType" AS ENUM ('muddatsiz', 'muddatli');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ishlamoqda', 'tatilda', 'ishdan_boshagan');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('ishga_qabul', 'lavozim_otkazish', 'tatil_berish', 'ishdan_boshatish', 'ragbatlantirish');

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parent_id" TEXT,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "positions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rank_order" INTEGER NOT NULL DEFAULT 100,
    "department_id" TEXT NOT NULL,
    "base_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "tab_number" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "birth_date" DATE,
    "birth_place" TEXT,
    "gender" "Gender",
    "nationality" TEXT,
    "party_membership" TEXT,
    "phone" TEXT,
    "address_residential" TEXT,
    "pinfl" VARCHAR(14),
    "passport_series_number" TEXT,
    "passport_given_date" DATE,
    "passport_given_by" TEXT,
    "department_id" TEXT NOT NULL,
    "position_id" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'shtat',
    "hire_date" DATE,
    "contract_number" TEXT,
    "contract_date" DATE,
    "contract_duration_type" "ContractDurationType" NOT NULL DEFAULT 'muddatsiz',
    "probation_months" INTEGER NOT NULL DEFAULT 0,
    "salary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "annual_leave_basic_days" INTEGER NOT NULL DEFAULT 21,
    "annual_leave_extra_days" INTEGER NOT NULL DEFAULT 6,
    "photo_url" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ishlamoqda',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_education" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "institution_name" TEXT NOT NULL,
    "speciality" TEXT,
    "study_type" TEXT,
    "start_year" INTEGER,
    "end_year" INTEGER,

    CONSTRAINT "employee_education_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_work_history" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "start_date" DATE,
    "end_date" DATE,
    "organization_name" TEXT NOT NULL,
    "position_title" TEXT,

    CONSTRAINT "employee_work_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_relatives" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "relative_type" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "birth_year_place" TEXT,
    "work_place_position" TEXT,
    "living_address" TEXT,

    CONSTRAINT "employee_relatives_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "order_date" DATE NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "employee_id" TEXT NOT NULL,
    "payload_json" JSONB NOT NULL DEFAULT '{}',
    "docx_file_path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "timesheet" (
    "id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "days_data" JSONB NOT NULL DEFAULT '{}',
    "total_worked_days" INTEGER NOT NULL DEFAULT 0,
    "total_worked_hours" INTEGER NOT NULL DEFAULT 0,
    "calculated_salary" DECIMAL(14,2) NOT NULL DEFAULT 0,

    CONSTRAINT "timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "employees_tab_number_key" ON "employees"("tab_number");

-- CreateIndex
CREATE INDEX "employees_department_id_idx" ON "employees"("department_id");

-- CreateIndex
CREATE INDEX "employees_position_id_idx" ON "employees"("position_id");

-- CreateIndex
CREATE UNIQUE INDEX "timesheet_employee_id_year_month_key" ON "timesheet"("employee_id", "year", "month");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "positions" ADD CONSTRAINT "positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_education" ADD CONSTRAINT "employee_education_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_work_history" ADD CONSTRAINT "employee_work_history_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_relatives" ADD CONSTRAINT "employee_relatives_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "timesheet" ADD CONSTRAINT "timesheet_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

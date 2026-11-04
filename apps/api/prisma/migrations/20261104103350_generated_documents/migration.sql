-- CreateTable
CREATE TABLE "generated_documents" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "number" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "file_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "generated_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "generated_documents_employee_id_type_idx" ON "generated_documents"("employee_id", "type");

-- AddForeignKey
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

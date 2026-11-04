import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';

const DEV = process.env.DATABASE_URL ?? 'postgresql://hrms:hrms@localhost:5432/hrms?schema=public';
export const TEST_URL = DEV.replace(/\/[^/?]+(\?|$)/, '/hrms_test$1');

/** Алоҳида `hrms_test` базасини яратади (йўқ бўлса), миграцияларни қўллайди ва жадвалларни тозалайди. */
export async function prepareTestDb() {
  const admin = new PrismaClient({ datasources: { db: { url: DEV.replace(/\/[^/?]+(\?|$)/, '/postgres$1') } } });
  try {
    const rows = await admin.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM pg_database WHERE datname = 'hrms_test'`;
    if (rows.length === 0) await admin.$executeRawUnsafe('CREATE DATABASE hrms_test');
  } finally { await admin.$disconnect(); }

  execSync('npx prisma migrate deploy', { cwd: join(__dirname, '..', '..'), env: { ...process.env, DATABASE_URL: TEST_URL }, stdio: 'pipe' });

  process.env.DATABASE_URL = TEST_URL;
  const db = new PrismaClient({ datasources: { db: { url: TEST_URL } } });
  try {
    await db.$executeRawUnsafe('TRUNCATE users, employees, positions, departments, settings, generated_documents, orders, timesheet RESTART IDENTITY CASCADE');
  } finally { await db.$disconnect(); }
}

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { join } from 'path';

const DEV = process.env.DATABASE_URL ?? 'postgresql://hrms:hrms@localhost:5432/hrms?schema=public';
const urlFor = (name: string) => DEV.replace(/\/[^/?]+(\?|$)/, `/${name}$1`);
export const TEST_URL = urlFor('hrms_test');

/** Алоҳида `hrms_test` базасини яратади (йўқ бўлса), миграцияларни қўллайди ва жадвалларни тозалайди. */
export async function prepareTestDb(name = 'hrms_test') {
  const url = urlFor(name);
  const admin = new PrismaClient({ datasources: { db: { url: DEV.replace(/\/[^/?]+(\?|$)/, '/postgres$1') } } });
  try {
    const rows = await admin.$queryRaw<{ n: number }[]>`SELECT 1 AS n FROM pg_database WHERE datname = ${name}`;
    if (rows.length === 0) await admin.$executeRawUnsafe(`CREATE DATABASE ${name}`);
  } finally { await admin.$disconnect(); }

  execSync('npx prisma migrate deploy', { cwd: join(__dirname, '..', '..'), env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });

  process.env.DATABASE_URL = url;
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    await db.$executeRawUnsafe('TRUNCATE users, employees, positions, departments, settings, generated_documents, orders, timesheet, calendar_days, audit_logs RESTART IDENTITY CASCADE');
  } finally { await db.$disconnect(); }
}

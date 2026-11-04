import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const viloyat = (await prisma.department.findFirst({ where: { name: "Farg'ona viloyat filiali" } })) ??
    (await prisma.department.create({ data: { name: "Farg'ona viloyat filiali", code: 'FRG' } }));
  const shahar = (await prisma.department.findFirst({ where: { name: "Qo'vasoy shahar bo'limi" } })) ??
    (await prisma.department.create({ data: { name: "Qo'vasoy shahar bo'limi", code: 'QVS', parentId: viloyat.id } }));

  const titles: [string, number, number][] = [
    ["Bo'lim boshlig'i", 1, 9000000],
    ['Yetakchi mutaxassis', 2, 6500000],
    ['Ijro intizomi bo\'yicha menejer', 3, 5750000],
    ['Mutaxassis', 4, 4500000],
  ];
  for (const [title, rankOrder, baseSalary] of titles) {
    const exists = await prisma.position.findFirst({ where: { title, departmentId: shahar.id } });
    if (!exists) await prisma.position.create({ data: { title, rankOrder, baseSalary, departmentId: shahar.id } });
  }

  const pos = await prisma.position.findFirstOrThrow({ where: { title: 'Yetakchi mutaxassis', departmentId: shahar.id } });
  await prisma.employee.upsert({
    where: { tabNumber: '0011' },
    update: {},
    create: {
      tabNumber: '0011', firstName: 'Aziz', lastName: 'Karimov', middleName: "Bahodir o'g'li",
      birthDate: new Date('1992-03-15'), gender: 'erkak', nationality: "o'zbek", partyMembership: "yo'q",
      pinfl: '31503920000011', passportSeriesNumber: 'AB8210665',
      departmentId: shahar.id, positionId: pos.id, hireDate: new Date('2026-05-01'),
      contractNumber: 'M 1/130', contractDate: new Date('2026-05-01'), salary: 6500000,
    },
  });
}

main().finally(() => prisma.$disconnect());

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DashboardModule } from './dashboard/dashboard.module';
import { DocumentsModule } from './documents/documents.module';
import { DepartmentsModule } from './departments/departments.module';
import { EmployeesModule } from './employees/employees.module';
import { HealthController } from './health.controller';
import { PositionsModule } from './positions/positions.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, DepartmentsModule, PositionsModule, EmployeesModule, DashboardModule, DocumentsModule],
  controllers: [HealthController],
})
export class AppModule {}

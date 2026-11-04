import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './departments.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private prisma: PrismaService) {}

  @Get() list() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }
  @Get(':id') get(@Param('id') id: string) {
    return this.prisma.department.findUniqueOrThrow({ where: { id }, include: { children: true } });
  }
  @Post() create(@Body() dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.prisma.department.update({ where: { id }, data: dto });
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.prisma.department.delete({ where: { id } });
  }
}

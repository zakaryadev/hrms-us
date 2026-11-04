import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './departments.dto';

@Controller('departments')
export class DepartmentsController {
  constructor(private prisma: PrismaService) {}

  @Get() list() {
    return this.prisma.department.findMany({ orderBy: { name: 'asc' } });
  }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.department.findUniqueOrThrow({ where: { id }, include: { children: true } });
  }
  @Post() create(@Body() dto: CreateDepartmentDto) {
    return this.prisma.department.create({ data: dto });
  }

  /** Бўлимни ўзига ёки ўз қуйи бўлимига бўйсундириб бўлмайди (дарахтда цикл бўлмаслиги учун). */
  private async assertNoCycle(id: string, parentId: string) {
    if (parentId === id) throw new BadRequestException('Бўлимни ўзига бўйсундириб бўлмайди');
    const all = await this.prisma.department.findMany({ select: { id: true, parentId: true } });
    const parentOf = new Map(all.map((d) => [d.id, d.parentId]));
    for (let cur: string | null | undefined = parentId; cur; cur = parentOf.get(cur)) {
      if (cur === id) throw new BadRequestException('Бўлимни ўзининг қуйи бўлимига бўйсундириб бўлмайди');
    }
  }

  @Patch(':id') async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateDepartmentDto) {
    if (dto.parentId) await this.assertNoCycle(id, dto.parentId);
    return this.prisma.department.update({ where: { id }, data: dto });
  }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.department.delete({ where: { id } });
  }
}

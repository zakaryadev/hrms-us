import { BadRequestException, Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto, UpdatePositionDto } from './positions.dto';

@Controller('positions')
export class PositionsController {
  constructor(private prisma: PrismaService) {}

  /** `occupied` — шу лавозимдаги ишлаётган (архивда бўлмаган) ходимлар сони */
  @Get() async list(@Query('departmentId') departmentId?: string) {
    const rows = await this.prisma.position.findMany({
      where: departmentId ? { departmentId } : undefined,
      orderBy: [{ rankOrder: 'asc' }, { title: 'asc' }],
      include: { _count: { select: { employees: { where: { status: { not: 'ishdan_boshagan' } } } } } },
    });
    return rows.map(({ _count, ...p }) => ({ ...p, occupied: _count.employees }));
  }
  @Post() create(@Body() dto: CreatePositionDto) {
    return this.prisma.position.create({ data: dto });
  }
  @Patch(':id') async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePositionDto) {
    if (dto.departmentId) {
      const current = await this.prisma.position.findUniqueOrThrow({ where: { id }, include: { _count: { select: { employees: true } } } });
      if (current.departmentId !== dto.departmentId && current._count.employees > 0) {
        throw new BadRequestException('Ходимлари бор лавозимни бошқа бўлимга кўчириб бўлмайди');
      }
    }
    return this.prisma.position.update({ where: { id }, data: dto });
  }
  @Delete(':id') remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.prisma.position.delete({ where: { id } });
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePositionDto, UpdatePositionDto } from './positions.dto';

@Controller('positions')
export class PositionsController {
  constructor(private prisma: PrismaService) {}

  @Get() list(@Query('departmentId') departmentId?: string) {
    return this.prisma.position.findMany({
      where: departmentId ? { departmentId } : undefined,
      orderBy: [{ rankOrder: 'asc' }, { title: 'asc' }],
    });
  }
  @Post() create(@Body() dto: CreatePositionDto) {
    return this.prisma.position.create({ data: dto });
  }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.prisma.position.update({ where: { id }, data: dto });
  }
  @Delete(':id') remove(@Param('id') id: string) {
    return this.prisma.position.delete({ where: { id } });
  }
}

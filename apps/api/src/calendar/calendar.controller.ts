import { Body, Controller, Delete, Get, Param, Put, Query } from '@nestjs/common';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { CalendarService } from './calendar.service';

class SetDayDto {
  @IsEnum(['holiday', 'dayoff', 'workday']) kind: 'holiday' | 'dayoff' | 'workday';
  @IsOptional() @IsString() @MaxLength(200) note?: string;
}

@Controller('calendar')
export class CalendarController {
  constructor(private svc: CalendarService) {}

  @Get() get(@Query('year') year: string) { return this.svc.year(Number(year) || new Date().getFullYear()); }

  @Put(':date') set(@Param('date') date: string, @Body() dto: SetDayDto) { return this.svc.set(date, dto.kind, dto.note); }

  @Delete(':date') remove(@Param('date') date: string) { return this.svc.remove(date); }
}

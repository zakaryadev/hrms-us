import { Body, Controller, Get, Param, Post, Put, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { TimesheetService, parsePeriod } from './timesheet.service';

@Controller('timesheet')
export class TimesheetController {
  constructor(private svc: TimesheetService) {}

  @Get()
  list(@Query('year') y: string, @Query('month') m: string, @Query('departmentId') departmentId?: string) {
    const { year, month } = parsePeriod(y, m);
    return this.svc.list(year, month, departmentId || undefined);
  }

  @Get('export')
  async export(@Query('year') y: string, @Query('month') m: string, @Query('departmentId') departmentId: string | undefined, @Res() res: Response) {
    const { year, month } = parsePeriod(y, m);
    const buf = await this.svc.exportXlsx(year, month, departmentId || undefined);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="tabel-${year}-${String(month).padStart(2, '0')}.xlsx"`);
    res.send(buf);
  }

  @Post('autofill')
  autofill(@Body() body: { year: number; month: number; departmentId?: string }) {
    const { year, month } = parsePeriod(body?.year, body?.month);
    return this.svc.autofill(year, month, body.departmentId || undefined);
  }

  @Put(':employeeId/:year/:month')
  save(@Param('employeeId') employeeId: string, @Param('year') y: string, @Param('month') m: string, @Body() body: { daysData: unknown }) {
    const { year, month } = parsePeriod(y, m);
    return this.svc.save(employeeId, year, month, body?.daysData);
  }
}

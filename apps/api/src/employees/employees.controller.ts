import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query,
  Req, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Roles } from '../auth/decorators';
import { CreateEmployeeDto, ListEmployeesQuery, UpdateEmployeeDto } from './employees.dto';
import { EmployeesImportService } from './employees-import.service';
import { EmployeesService } from './employees.service';

@Controller('employees')
export class EmployeesController {
  constructor(private svc: EmployeesService, private importer: EmployeesImportService) {}

  @Get() list(@Query() q: ListEmployeesQuery) { return this.svc.list(q); }

  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  import(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('«file» майдонида Excel файл юборинг');
    return this.importer.import(file.buffer);
  }

  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Post() create(@Body() dto: CreateEmployeeDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) { return this.svc.update(id, dto); }
  /** Ходимни базадан бутунлай ўчириш — фақат суперадмин; одатда «Архив»га ўтказиш керак. */
  @Roles('superadmin')
  @Delete(':id') async remove(@Param('id') id: string, @Req() req: any) {
    const e = await this.svc.remove(id);
    req.auditSummary = `Ходим бутунлай ўчирилди: ${[e.lastName, e.firstName, e.middleName].filter(Boolean).join(' ')} (${e.tabNumber})`;
    return e;
  }
}

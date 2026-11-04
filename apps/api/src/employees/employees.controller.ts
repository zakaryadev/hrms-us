import {
  BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query,
  UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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
    if (!file) throw new BadRequestException('"file" maydonida Excel fayl yuboring');
    return this.importer.import(file.buffer);
  }

  @Get(':id') get(@Param('id') id: string) { return this.svc.get(id); }
  @Post() create(@Body() dto: CreateEmployeeDto) { return this.svc.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) { return this.svc.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

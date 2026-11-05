import { Module } from '@nestjs/common';
import { TimesheetModule } from '../timesheet/timesheet.module';
import { DocumentsGenController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocxService } from './docx.service';
import { TemplatesController } from './templates.controller';
import { TemplatesService } from './templates.service';

@Module({ imports: [TimesheetModule], controllers: [DocumentsGenController, TemplatesController], providers: [DocxService, DocumentsService, TemplatesService], exports: [DocxService] })
export class DocxModule {}

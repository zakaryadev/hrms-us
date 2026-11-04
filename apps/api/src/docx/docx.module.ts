import { Module } from '@nestjs/common';
import { TimesheetModule } from '../timesheet/timesheet.module';
import { DocumentsGenController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocxService } from './docx.service';

@Module({ imports: [TimesheetModule], controllers: [DocumentsGenController], providers: [DocxService, DocumentsService], exports: [DocxService] })
export class DocxModule {}

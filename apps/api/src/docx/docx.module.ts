import { Module } from '@nestjs/common';
import { DocumentsGenController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { DocxService } from './docx.service';

@Module({ controllers: [DocumentsGenController], providers: [DocxService, DocumentsService], exports: [DocxService] })
export class DocxModule {}

import { Module } from '@nestjs/common';
import { JournalOptionsService } from './journal-options.service';
import { JournalReportService } from './journal-report.service';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';

@Module({ controllers: [JournalController], providers: [JournalService, JournalOptionsService, JournalReportService] })
export class JournalModule {}

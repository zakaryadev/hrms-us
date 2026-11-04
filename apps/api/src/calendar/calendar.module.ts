import { Global, Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';

@Global()
@Module({ controllers: [CalendarController], providers: [CalendarService], exports: [CalendarService] })
export class CalendarModule {}

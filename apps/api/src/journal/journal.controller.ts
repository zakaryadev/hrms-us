import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { CurrentUser, Roles, type AuthUser } from '../auth/decorators';
import { JournalOptionsService } from './journal-options.service';
import { JournalReportService } from './journal-report.service';
import {
  EntryDto, KbDto, MergeOrgDto, OptionDto, OptionReorderDto, OptionUpdateDto, OrgDto, SettingsDto, TicketDto, TicketStatusDto, TrainingDto,
} from './journal.dto';
import { JournalService, type ListQuery } from './journal.service';

class TicketUpdateDto extends PartialType(TicketDto) {}
class EntryUpdateDto extends PartialType(EntryDto) {}
class TrainingUpdateDto extends PartialType(TrainingDto) {}
class KbUpdateDto extends PartialType(KbDto) {}
class OrgUpdateDto extends PartialType(OrgDto) {}

/**
 * Рухсатлар (AuthGuard'да): ёзиш — фақат superadmin/operator; ўқиш — барча ролларга.
 * Рўйхатлар ва меъёрни ўзгартириш — фақат superadmin.
 */
@Controller('journal')
export class JournalController {
  constructor(private svc: JournalService, private options: JournalOptionsService, private reports: JournalReportService) {}

  /** Рўйхатлар (иш тури, канал…) ва меъёр — барча формалар учун бир сўровда */
  @Get('meta') meta() { return this.svc.meta(); }
  @Roles('superadmin') @Patch('settings') settings(@Body() dto: SettingsDto) { return this.svc.setNormDays(dto.normDays); }

  @Roles('superadmin') @Post('options') createOption(@Body() dto: OptionDto) { return this.options.create(dto); }
  @Roles('superadmin') @Put('options/order') @HttpCode(204) reorder(@Body() dto: OptionReorderDto) { return this.options.reorder(dto.kind, dto.ids); }
  @Roles('superadmin') @Patch('options/:id') updateOption(@Param('id', ParseUUIDPipe) id: string, @Body() dto: OptionUpdateDto) { return this.options.update(id, dto); }
  @Roles('superadmin') @Delete('options/:id') @HttpCode(204) removeOption(@Param('id', ParseUUIDPipe) id: string) { return this.options.remove(id); }

  @Get('report') report(@Query('month') month: string, @Query('scope') scope: string | undefined, @CurrentUser() u: AuthUser) {
    return this.reports.report(month, scope === 'me' ? u.id : undefined);
  }

  // Ташкилотлар
  @Get('orgs') orgs(@Query('q') q?: string) { return this.svc.listOrgs(q); }
  @Get('orgs/:id') org(@Param('id', ParseUUIDPipe) id: string) { return this.svc.orgHistory(id); }
  @Post('orgs') createOrg(@Body() dto: OrgDto) { return this.svc.createOrg(dto); }
  @Patch('orgs/:id') updateOrg(@Param('id', ParseUUIDPipe) id: string, @Body() dto: OrgUpdateDto) { return this.svc.updateOrg(id, dto); }
  @Post('orgs/:id/merge') mergeOrg(@Param('id', ParseUUIDPipe) id: string, @Body() dto: MergeOrgDto) { return this.svc.mergeOrg(id, dto.intoId); }
  @Delete('orgs/:id') removeOrg(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeOrg(id); }

  // Мурожаатлар
  @Get('tickets') tickets(@Query() q: ListQuery, @CurrentUser() u: AuthUser) { return this.svc.listTickets(q, u); }
  @Get('tickets/:id') ticket(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getTicket(id); }
  @Post('tickets') createTicket(@Body() dto: TicketDto, @CurrentUser() u: AuthUser) { return this.svc.createTicket(dto, u); }
  @Patch('tickets/:id') updateTicket(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TicketUpdateDto) { return this.svc.updateTicket(id, dto); }
  @Post('tickets/:id/status') @HttpCode(200) setStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TicketStatusDto, @CurrentUser() u: AuthUser) { return this.svc.setTicketStatus(id, dto, u); }
  @Delete('tickets/:id') removeTicket(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeTicket(id); }

  // Кундалик журнал
  @Get('entries') entries(@Query() q: ListQuery, @CurrentUser() u: AuthUser) { return this.svc.listEntries(q, u); }
  @Post('entries') createEntry(@Body() dto: EntryDto, @CurrentUser() u: AuthUser) { return this.svc.createEntry(dto, u); }
  @Patch('entries/:id') updateEntry(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EntryUpdateDto) { return this.svc.updateEntry(id, dto); }
  @Delete('entries/:id') removeEntry(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeEntry(id); }

  // Ўқитиш
  @Get('trainings') trainings(@Query() q: ListQuery, @CurrentUser() u: AuthUser) { return this.svc.listTrainings(q, u); }
  @Post('trainings') createTraining(@Body() dto: TrainingDto, @CurrentUser() u: AuthUser) { return this.svc.createTraining(dto, u); }
  @Patch('trainings/:id') updateTraining(@Param('id', ParseUUIDPipe) id: string, @Body() dto: TrainingUpdateDto) { return this.svc.updateTraining(id, dto); }
  @Delete('trainings/:id') removeTraining(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeTraining(id); }

  // Билимлар базаси
  @Get('kb') kb(@Query() q: ListQuery, @CurrentUser() u: AuthUser) { return this.svc.listKb(q, u); }
  @Post('kb') createKb(@Body() dto: KbDto, @CurrentUser() u: AuthUser) { return this.svc.createKb(dto, u); }
  @Patch('kb/:id') updateKb(@Param('id', ParseUUIDPipe) id: string, @Body() dto: KbUpdateDto) { return this.svc.updateKb(id, dto); }
  @Delete('kb/:id') removeKb(@Param('id', ParseUUIDPipe) id: string) { return this.svc.removeKb(id); }
}

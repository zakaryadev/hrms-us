import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import { CurrentUser, Roles, type AuthUser } from '../auth/decorators';
import { EntryDto, JournalSettingsDto, KbDto, MergeOrgDto, OrgDto, OrgUpdateDto, TicketDto, TrainingDto } from './journal.dto';
import { JournalService, type ListQuery } from './journal.service';

class TicketUpdateDto extends PartialType(TicketDto) {}
class EntryUpdateDto extends PartialType(EntryDto) {}
class TrainingUpdateDto extends PartialType(TrainingDto) {}
class KbUpdateDto extends PartialType(KbDto) {}

/**
 * Рухсатлар (AuthGuard'да): ёзиш — фақат superadmin/operator; ўқиш — superadmin, kadrlar, buxgalter, operator, rahbar.
 * Рўйхатларни (settings) ўзгартириш — фақат superadmin.
 * Ҳисоботда `scope=me` — фақат жорий ходим, акс ҳолда бутун бўлим.
 */
@Controller('journal')
export class JournalController {
  constructor(private svc: JournalService) {}

  @Get('settings') settings() { return this.svc.getSettings(); }
  @Roles('superadmin') @Patch('settings') updateSettings(@Body() dto: JournalSettingsDto) { return this.svc.updateSettings(dto); }

  @Get('report') report(@Query('month') month: string, @Query('scope') scope: string | undefined, @CurrentUser() u: AuthUser) {
    return this.svc.report(month, scope === 'me' ? u.id : undefined);
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

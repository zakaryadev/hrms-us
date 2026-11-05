import { Controller, Get, Query } from '@nestjs/common';
import { Roles } from '../auth/decorators';
import { AuditService } from './audit.service';

@Roles('superadmin')
@Controller('audit')
export class AuditController {
  constructor(private svc: AuditService) {}
  @Get() list(@Query('entity') entity?: string, @Query('userId') userId?: string, @Query('q') q?: string, @Query('page') page?: string) {
    return this.svc.list({ entity, userId, q, page: page ? Number(page) || 1 : 1 });
  }
}

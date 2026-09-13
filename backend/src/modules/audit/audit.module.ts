import { Module } from '@nestjs/common';
import { AuditController } from './controllers/audit.controller.js';
import { AuditEventRepository } from './repositories/audit-event.repository.js';
import { AuditQueryService } from './services/audit-query.service.js';
import { AuditTrailService } from './services/audit-trail.service.js';
@Module({controllers:[AuditController],providers:[AuditEventRepository,AuditTrailService,AuditQueryService],exports:[AuditTrailService]}) export class AuditModule {}

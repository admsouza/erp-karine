import { Module } from '@nestjs/common';
import { AuditEventRepository } from './repositories/audit-event.repository.js';
import { AuditTrailService } from './services/audit-trail.service.js';
@Module({providers:[AuditEventRepository,AuditTrailService],exports:[AuditTrailService]}) export class AuditModule {}
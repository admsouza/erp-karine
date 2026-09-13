import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { AuditEventRepository } from '../repositories/audit-event.repository.js';
export interface AuditChange { field:string; before:string|number|null; after:string|number|null }
export interface RecordAuditEvent { actorUserId:string;actorName?:string;actorEmail?:string;module:string;entityType:string;entityId:string;action:string;requestId?:string;reason?:string;changes:AuditChange[] }
@Injectable()
export class AuditTrailService {
 constructor(private readonly repository:AuditEventRepository){}
 record(event:RecordAuditEvent,tx?:Prisma.TransactionClient){return this.repository.create({...event,actorName:event.actorName??null,actorEmail:event.actorEmail??null,requestId:event.requestId??null,reason:event.reason??null,changes:event.changes as unknown as Prisma.InputJsonValue},tx);}
 timeline(entityType:string,entityId:string,page:number,pageSize:number){return this.repository.list(entityType,entityId,page,pageSize);}
}
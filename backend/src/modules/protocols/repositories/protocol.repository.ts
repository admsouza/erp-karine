import { Injectable } from '@nestjs/common';
import type { Prisma, ProtocolStatus } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
export interface ProtocolFilters { search?: string; clientId?: string; status?: ProtocolStatus; active?: boolean; skip: number; take: number; }
@Injectable()
export class ProtocolRepository {
 constructor(private readonly prisma: PrismaService) {}
 create(data: Prisma.ProtocolUncheckedCreateInput) { return this.prisma.protocol.create({ data }); }
 findById(id: string) { return this.prisma.protocol.findUnique({ where:{id} }); }
 update(id: string, data: Prisma.ProtocolUncheckedUpdateInput) { return this.prisma.protocol.update({where:{id},data}); }
 async findPage(filters: ProtocolFilters) { const where: Prisma.ProtocolWhereInput={clientId:filters.clientId,status:filters.status,active:filters.active,deletedAt:null,OR:filters.search?[{title:{contains:filters.search,mode:'insensitive'}},{clientName:{contains:filters.search,mode:'insensitive'}},{procedureName:{contains:filters.search,mode:'insensitive'}}]:undefined}; const [items,total]=await this.prisma.$transaction([this.prisma.protocol.findMany({where,skip:filters.skip,take:filters.take,orderBy:{date:'desc'}}),this.prisma.protocol.count({where})]); return {items,total}; }
 createSession(data: Prisma.ProtocolSessionUncheckedCreateInput) { return this.prisma.protocolSession.create({data}); }
 findSessionByAppointmentId(appointmentId:string) { return this.prisma.protocolSession.findUnique({where:{appointmentId}}); }
 listSessions(protocolId:string) { return this.prisma.protocolSession.findMany({where:{protocolId},orderBy:[{date:'asc'},{createdAt:'asc'}]}); }
}

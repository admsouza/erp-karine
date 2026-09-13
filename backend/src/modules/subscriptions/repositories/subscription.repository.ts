import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
@Injectable() export class SubscriptionRepository {
 constructor(private readonly prisma: PrismaService) {}
 create(data:Prisma.ClientSubscriptionUncheckedCreateInput){return this.prisma.clientSubscription.create({data});}
 findById(id:string){return this.prisma.clientSubscription.findUnique({where:{id}});}
 findActiveByClientAndPlan(clientId:string,planId:string){return this.prisma.clientSubscription.findFirst({where:{clientId,planId,status:{in:['ATIVA','INADIMPLENTE']}}});}
 update(id:string,data:Prisma.ClientSubscriptionUncheckedUpdateInput){return this.prisma.clientSubscription.update({where:{id},data});}
 findMany(filters:{clientId?:string;status?:Prisma.EnumSubscriptionStatusFilter['equals']}){return this.prisma.clientSubscription.findMany({where:filters,orderBy:{startDate:'desc'}});}
}

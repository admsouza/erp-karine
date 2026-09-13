import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
@Injectable() export class SubscriptionPlanRepository {
 constructor(private readonly prisma: PrismaService) {}
 create(data: Prisma.SubscriptionPlanCreateInput) { return this.prisma.subscriptionPlan.create({ data }); }
 update(id:string,data:Prisma.SubscriptionPlanUpdateInput) { return this.prisma.subscriptionPlan.update({where:{id},data}); }
 findById(id:string) { return this.prisma.subscriptionPlan.findFirst({where:{id,deletedAt:null}}); }
 findByName(name:string) { return this.prisma.subscriptionPlan.findFirst({where:{name,deletedAt:null}}); }
 findMany(filters:{search?:string;active?:boolean}) { return this.prisma.subscriptionPlan.findMany({where:{deletedAt:null,active:filters.active,OR:filters.search?[{name:{contains:filters.search,mode:'insensitive'}},{description:{contains:filters.search,mode:'insensitive'}}]:undefined},orderBy:{name:'asc'}}); }
}

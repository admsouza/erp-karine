import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
@Injectable() export class SubscriptionPaymentRepository {
 constructor(private readonly prisma:PrismaService){}
 create(data:Prisma.SubscriptionPaymentUncheckedCreateInput){return this.prisma.subscriptionPayment.create({data});}
 findBySubscription(subscriptionId:string){return this.prisma.subscriptionPayment.findMany({where:{subscriptionId},orderBy:{paidAt:'desc'}});}
}

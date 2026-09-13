import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
@Injectable() export class SubscriptionPaymentRepository {
 constructor(private readonly prisma:PrismaService){}
 create(data:Prisma.SubscriptionPaymentUncheckedCreateInput){return this.prisma.subscriptionPayment.create({data});}
 createInTransaction(data:Prisma.SubscriptionPaymentUncheckedCreateInput,work:(payment:Awaited<ReturnType<Prisma.TransactionClient['subscriptionPayment']['create']>>,tx:Prisma.TransactionClient)=>Promise<void>){return this.prisma.$transaction(async tx=>{const payment=await tx.subscriptionPayment.create({data});await work(payment,tx);return payment;});}
 findById(id:string){return this.prisma.subscriptionPayment.findUnique({where:{id}});}
 findBySubscription(subscriptionId:string){return this.prisma.subscriptionPayment.findMany({where:{subscriptionId},orderBy:{paidAt:'desc'}});}
 updateInTransaction(id:string,data:Prisma.SubscriptionPaymentUncheckedUpdateInput,work:(payment:Awaited<ReturnType<Prisma.TransactionClient['subscriptionPayment']['update']>>,tx:Prisma.TransactionClient)=>Promise<unknown>){return this.prisma.$transaction(async tx=>{const payment=await tx.subscriptionPayment.update({where:{id},data});await work(payment,tx);return payment;});}
}

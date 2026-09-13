import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';
import type { AppointmentFilters } from '../services/appointment-query.service.js';

@Injectable()
export class AppointmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.AppointmentUncheckedCreateInput) {
    return this.prisma.appointment.create({ data });
  }

  findById(id: string) {
    return this.prisma.appointment.findUnique({ where: { id } });
  }

  update(id: string, data: Prisma.AppointmentUncheckedUpdateInput) {
    return this.prisma.appointment.update({ where: { id }, data });
  }

  updateInTransaction(id:string,data:Prisma.AppointmentUncheckedUpdateInput,work:(item:Awaited<ReturnType<Prisma.TransactionClient['appointment']['update']>>,tx:Prisma.TransactionClient)=>Promise<void>){return this.prisma.$transaction(async tx=>{const item=await tx.appointment.update({where:{id},data});await work(item,tx);return item;});}
  findMany(filters: AppointmentFilters) {
    return this.prisma.appointment.findMany({
      where: {
        scheduledAt: filters.from || filters.to ? { gte: filters.from, lt: filters.to } : undefined,
        clientId: filters.clientId,
        status: filters.status,
      },
      orderBy: { scheduledAt: 'asc' },
    });
  }
}

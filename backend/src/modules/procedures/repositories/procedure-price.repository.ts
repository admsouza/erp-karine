import { Injectable } from '@nestjs/common';
import type { ProcedurePrice, Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../common/database/prisma.service.js';

/** Único ponto do módulo que fala com o Prisma para vigências de valor. */
@Injectable()
export class ProcedurePriceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: Prisma.ProcedurePriceCreateInput): Promise<ProcedurePrice> {
    return this.prisma.procedurePrice.create({ data });
  }

  /** Histórico completo, do mais recente para o mais antigo. */
  findByProcedure(procedureId: string): Promise<ProcedurePrice[]> {
    return this.prisma.procedurePrice.findMany({
      where: { procedureId },
      orderBy: { validFrom: 'desc' },
    });
  }

  /** Última vigência cadastrada (maior `validFrom`), independente de estar aberta. */
  findLatest(procedureId: string): Promise<ProcedurePrice | null> {
    return this.prisma.procedurePrice.findFirst({
      where: { procedureId },
      orderBy: { validFrom: 'desc' },
    });
  }

  findById(id: string): Promise<ProcedurePrice | null> {
    return this.prisma.procedurePrice.findFirst({ where: { id } });
  }

  findByValidFrom(procedureId: string, validFrom: Date): Promise<ProcedurePrice | null> {
    return this.prisma.procedurePrice.findFirst({ where: { procedureId, validFrom } });
  }

  /** Vigência que vale na data informada. */
  findOn(procedureId: string, date: Date): Promise<ProcedurePrice | null> {
    return this.prisma.procedurePrice.findFirst({
      where: {
        procedureId,
        validFrom: { lte: date },
        OR: [{ validTo: null }, { validTo: { gt: date } }],
      },
      orderBy: { validFrom: 'desc' },
    });
  }

  /** Vigências abertas de vários procedimentos (uma consulta para a listagem). */
  findOpenByProcedureIds(procedureIds: string[]): Promise<ProcedurePrice[]> {
    if (procedureIds.length === 0) return Promise.resolve([]);
    return this.prisma.procedurePrice.findMany({
      where: { procedureId: { in: procedureIds }, validTo: null },
    });
  }

  countByProcedure(procedureId: string): Promise<number> {
    return this.prisma.procedurePrice.count({ where: { procedureId } });
  }

  delete(id: string): Promise<ProcedurePrice> {
    return this.prisma.procedurePrice.delete({ where: { id } });
  }

  /** Fecha a vigência aberta no dia anterior ao início da nova. */
  async closeOpen(procedureId: string, validTo: Date): Promise<void> {
    await this.prisma.procedurePrice.updateMany({
      where: { procedureId, validTo: null },
      data: { validTo },
    });
  }

  /** Reabre uma vigência (correção: ao remover a última, a anterior volta a valer). */
  reopen(id: string, validFrom: Date): Promise<ProcedurePrice> {
    return this.prisma.procedurePrice.update({ where: { id }, data: { validTo: null, validFrom } });
  }
}

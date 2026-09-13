import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';

/**
 * Cliente Prisma único compartilhado por todos os módulos.
 *
 * Driver adapter: node-postgres (`pg`). A URL vem sempre do ambiente
 * (DATABASE_URL) — sem fallback silencioso, para o container falhar no boot
 * em vez de subir apontando para o banco errado.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim();
    if (!connectionString) {
      throw new Error('DATABASE_URL não definida: configure a variável de ambiente do banco.');
    }
    super({ adapter: new PrismaPg({ connectionString }) });
    this.logger.log('PostgreSQL conectado (driver adapter pg)');
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

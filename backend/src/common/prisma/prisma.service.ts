import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from '../../generated/prisma/client.js';

const DEFAULT_DATABASE_URL = 'file:./dev.db';

/**
 * Cliente Prisma único compartilhado por todos os módulos.
 *
 * Driver adapter: libSQL. Diferente do better-sqlite3 (binário por versão de
 * Node), o libSQL usa binários N-API — o mesmo `node_modules` funciona em
 * qualquer versão de Node, sem `npm rebuild` a cada troca de runtime.
 * Decisão registrada em ARCHITECTURE.md.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const databaseUrl = process.env.DATABASE_URL?.trim() || DEFAULT_DATABASE_URL;
    super({ adapter: new PrismaLibSql({ url: databaseUrl }) });
    this.logger.log(`SQLite conectado via ${databaseUrl}`);
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

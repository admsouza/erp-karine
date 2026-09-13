import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

/**
 * Acesso ao banco encapsulado em um único provider global.
 * Nenhum módulo deve instanciar PrismaClient por conta própria; cada módulo
 * expõe seu próprio repositório e recebe o PrismaService por injeção.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}

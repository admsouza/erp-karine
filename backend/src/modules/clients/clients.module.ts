import { Module } from '@nestjs/common';
import { ClientsController } from './controllers/clients.controller.js';
import { ClientRepository } from './repositories/client.repository.js';
import { ClientQueryService } from './services/client-query.service.js';
import { ClientService } from './services/client.service.js';

/**
 * Módulo de Clientes — cadastro e situação do cliente da clínica.
 *
 * Contrato público: `ClientQueryService` (leitura). Outros módulos importam
 * ClientsModule e injetam esse serviço; nunca acessam ClientRepository nem o Prisma.
 * Detalhes em MODULES.md.
 */
@Module({
  controllers: [ClientsController],
  providers: [ClientRepository, ClientService, ClientQueryService],
  exports: [ClientQueryService],
})
export class ClientsModule {}

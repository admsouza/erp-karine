import { Injectable, NotFoundException } from '@nestjs/common';
import {
  buildPaginatedResult,
  type PaginatedResult,
} from '../../../common/pagination/paginated.js';
import { toClientEntity, type ClientEntity } from '../entities/client.entity.js';
import type { ActiveFilter, ListClientsQueryDto } from '../dto/list-clients-query.dto.js';
import { ClientRepository } from '../repositories/client.repository.js';

/**
 * Contrato PÚBLICO do módulo de clientes para leitura.
 * Outros módulos (agenda, assinaturas, protocolos, exames, dashboard) devem
 * depender apenas deste serviço — nunca do repositório ou do modelo do Prisma.
 */
/** Converte o filtro textual da query em booleano para o repositório. */
function toActiveBoolean(active?: ActiveFilter): boolean | undefined {
  if (active === undefined) {
    return undefined;
  }
  return active === 'true';
}

@Injectable()
export class ClientQueryService {
  constructor(private readonly repository: ClientRepository) {}

  async findById(id: string): Promise<ClientEntity | null> {
    const model = await this.repository.findById(id);
    return model ? toClientEntity(model) : null;
  }

  /** Igual a findById, mas lança 404 quando o cliente não existe. */
  async getById(id: string): Promise<ClientEntity> {
    const client = await this.findById(id);
    if (!client) {
      throw new NotFoundException('Cliente não encontrado.');
    }
    return client;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.repository.findById(id)) !== null;
  }

  async list(query: ListClientsQueryDto): Promise<PaginatedResult<ClientEntity>> {
    const { items, total } = await this.repository.findPage({
      search: query.search,
      active: toActiveBoolean(query.active),
      skip: query.skip,
      take: query.pageSize,
    });

    return buildPaginatedResult(items.map(toClientEntity), total, query);
  }
}

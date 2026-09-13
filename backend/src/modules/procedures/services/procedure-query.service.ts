import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResult, type PaginatedResult } from '../../../common/pagination/paginated.js';
import { ProcedureRepository } from '../repositories/procedure.repository.js';
import { toProcedureEntity, type ProcedureEntity } from '../entities/procedure.entity.js';
import type { ListProceduresQueryDto } from '../dto/list-procedures-query.dto.js';

/**
 * Contrato público do módulo: é por aqui que os outros módulos (agenda,
 * protocolos, financeiro) leem procedimentos — **pelo id**, sem tocar no
 * repositório nem nas tabelas deste domínio.
 */
@Injectable()
export class ProcedureQueryService {
  constructor(private readonly repository: ProcedureRepository) {}

  async findById(id: string): Promise<ProcedureEntity | null> {
    const model = await this.repository.findById(id);
    return model ? toProcedureEntity(model) : null;
  }

  /** Usado por outros módulos: lança 404 se não existir. */
  async getById(id: string): Promise<ProcedureEntity> {
    const procedure = await this.findById(id);
    if (!procedure) throw new NotFoundException('Procedimento não encontrado.');
    return procedure;
  }

  async exists(id: string): Promise<boolean> {
    return (await this.repository.findById(id)) !== null;
  }

  async list(query: ListProceduresQueryDto): Promise<PaginatedResult<ProcedureEntity>> {
    const { items, total } = await this.repository.findPage({
      search: query.search,
      active: query.active === undefined ? undefined : query.active === 'true',
      skip: query.skip,
      take: query.pageSize,
    });

    return buildPaginatedResult(items.map(toProcedureEntity), total, query);
  }
}

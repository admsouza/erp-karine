import { Injectable, NotFoundException } from '@nestjs/common';
import { buildPaginatedResult, type PaginatedResult } from '../../../common/pagination/paginated.js';
import { ProcedureRepository } from '../repositories/procedure.repository.js';
import { ProcedurePriceRepository } from '../repositories/procedure-price.repository.js';
import { toProcedureEntity, type ProcedureEntity } from '../entities/procedure.entity.js';
import { dataDeHoje, parseData } from '../utils/date.js';
import type { ListProceduresQueryDto } from '../dto/list-procedures-query.dto.js';

/**
 * Contrato público do módulo: é por aqui que os outros módulos (agenda,
 * protocolos, financeiro) leem procedimentos — **pelo id**, sem tocar no
 * repositório nem nas tabelas deste domínio.
 */
@Injectable()
export class ProcedureQueryService {
  constructor(
    private readonly repository: ProcedureRepository,
    private readonly prices: ProcedurePriceRepository,
  ) {}

  async findById(id: string): Promise<ProcedureEntity | null> {
    const model = await this.repository.findById(id);
    if (!model) return null;

    const vigente = await this.prices.findOn(id, dataDeHoje());
    return toProcedureEntity(model, vigente?.valueCents ?? null);
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

  /**
   * Valor unitário que valia em uma data (padrão: hoje). É o que o financeiro
   * usa para não recalcular um atendimento antigo com o preço de hoje.
   */
  async valueOn(id: string, date?: string | Date): Promise<number | null> {
    await this.getById(id);
    const quando = date instanceof Date ? date : date ? parseData(date) : dataDeHoje();
    const vigente = await this.prices.findOn(id, quando);
    return vigente?.valueCents ?? null;
  }

  async list(query: ListProceduresQueryDto): Promise<PaginatedResult<ProcedureEntity>> {
    const { items, total } = await this.repository.findPage({
      search: query.search,
      active: query.active === undefined ? undefined : query.active === 'true',
      skip: query.skip,
      take: query.pageSize,
    });

    const valores = await this.prices.findOpenByProcedureIds(items.map((item) => item.id));
    const porProcedimento = new Map(valores.map((v) => [v.procedureId, v.valueCents]));

    return buildPaginatedResult(
      items.map((item) => toProcedureEntity(item, porProcedimento.get(item.id) ?? null)),
      total,
      query,
    );
  }
}

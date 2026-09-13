import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProcedurePriceRepository } from '../repositories/procedure-price.repository.js';
import { ProcedureQueryService } from './procedure-query.service.js';
import { toProcedurePriceEntity, type ProcedurePriceEntity } from '../entities/procedure-price.entity.js';
import type { CreateProcedurePriceDto } from '../dto/create-procedure-price.dto.js';
import type { UpdateProcedurePriceDto } from '../dto/update-procedure-price.dto.js';
import { dataDeHoje, formatarData, parseData } from '../utils/date.js';

/**
 * Vigências de valor dos procedimentos.
 *
 * Regra central: **o histórico não é reescrito**. Mudar o preço cria uma vigência
 * nova, que passa a valer a partir da data escolhida, e fecha a anterior no dia
 * em que a nova começa. Consultas por data sempre devolvem o valor que valia
 * naquele dia — é isso que preserva a série histórica para o financeiro.
 */
@Injectable()
export class ProcedurePriceService {
  constructor(
    private readonly repository: ProcedurePriceRepository,
    private readonly procedures: ProcedureQueryService,
  ) {}

  async list(procedureId: string): Promise<ProcedurePriceEntity[]> {
    await this.procedures.getById(procedureId);
    const vigencias = await this.repository.findByProcedure(procedureId);
    return vigencias.map(toProcedurePriceEntity);
  }

  async add(procedureId: string, dto: CreateProcedurePriceDto): Promise<ProcedurePriceEntity> {
    await this.procedures.getById(procedureId);
    const validFrom = dto.validFrom ? parseData(dto.validFrom) : dataDeHoje();

    const ultima = await this.repository.findLatest(procedureId);
    if (ultima && validFrom.getTime() <= ultima.validFrom.getTime()) {
      throw new ConflictException(
        `A nova vigência precisa começar depois de ${formatarData(ultima.validFrom)}, que é a mais recente deste procedimento.`,
      );
    }

    if (await this.repository.findByValidFrom(procedureId, validFrom)) {
      throw new ConflictException(`Já existe vigência começando em ${formatarData(validFrom)}.`);
    }

    // Fecha a vigência atual no dia em que a nova passa a valer.
    await this.repository.closeOpen(procedureId, validFrom);

    const criada = await this.repository.create({
      valueCents: dto.valueCents,
      validFrom,
      note: dto.note?.trim() || null,
      procedure: { connect: { id: procedureId } },
    });

    return toProcedurePriceEntity(criada);
  }

  /**
   * Corrige a vigência **atual** (valor e/ou observação).
   *
   * Só a vigência em aberto é editável: valor de vigência encerrada já foi o
   * preço praticado em algum período e não pode ser reescrito — para mudar o
   * preço daqui pra frente, cria-se uma vigência nova.
   */
  async update(
    procedureId: string,
    priceId: string,
    dto: UpdateProcedurePriceDto,
  ): Promise<ProcedurePriceEntity> {
    await this.procedures.getById(procedureId);

    const vigencia = await this.repository.findById(priceId);
    if (!vigencia || vigencia.procedureId !== procedureId) {
      throw new NotFoundException('Vigência não encontrada para este procedimento.');
    }
    if (vigencia.validTo !== null) {
      throw new ConflictException(
        `Esta vigência já foi encerrada em ${formatarData(vigencia.validTo)} e não pode ser alterada. Crie uma vigência nova para o preço daqui pra frente.`,
      );
    }
    if (dto.valueCents === undefined && dto.note === undefined) {
      throw new BadRequestException('Informe o novo valor ou a observação.');
    }

    const atualizada = await this.repository.update(priceId, {
      ...(dto.valueCents !== undefined ? { valueCents: dto.valueCents } : {}),
      ...(dto.note !== undefined ? { note: dto.note || null } : {}),
    });

    return toProcedurePriceEntity(atualizada);
  }

  /** Remove uma vigência (correção). Se era a atual, a anterior volta a valer. */
  async remove(procedureId: string, priceId: string): Promise<void> {
    await this.procedures.getById(procedureId);

    const vigencia = await this.repository.findById(priceId);
    if (!vigencia || vigencia.procedureId !== procedureId) {
      throw new NotFoundException('Vigência não encontrada para este procedimento.');
    }

    if ((await this.repository.countByProcedure(procedureId)) <= 1) {
      throw new ConflictException(
        'Este é o único valor do procedimento. Cadastre o novo valor antes de remover este.',
      );
    }

    await this.repository.delete(priceId);

    if (vigencia.validTo === null) {
      const ultima = await this.repository.findLatest(procedureId);
      if (ultima) await this.repository.reopen(ultima.id, ultima.validFrom);
    }
  }

  /** Valor unitário vigente hoje. */
  async currentValueCents(procedureId: string): Promise<number | null> {
    return this.valueOn(procedureId, dataDeHoje());
  }

  /** Valor unitário que valia em uma data (a base da série histórica). */
  async valueOn(procedureId: string, date: Date): Promise<number | null> {
    const vigencia = await this.repository.findOn(procedureId, date);
    return vigencia?.valueCents ?? null;
  }

  /** Valores vigentes de vários procedimentos (uma consulta, para a listagem). */
  async currentValuesOf(procedureIds: string[]): Promise<Map<string, number>> {
    const abertas = await this.repository.findOpenByProcedureIds(procedureIds);
    return new Map(abertas.map((vigencia) => [vigencia.procedureId, vigencia.valueCents]));
  }
}

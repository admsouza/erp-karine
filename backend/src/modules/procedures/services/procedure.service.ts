import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ProcedureRepository } from '../repositories/procedure.repository.js';
import { ProcedureQueryService } from './procedure-query.service.js';
import { ProcedurePriceService } from './procedure-price.service.js';
import { toProcedureEntity, type ProcedureEntity } from '../entities/procedure.entity.js';
import type { CreateProcedureDto } from '../dto/create-procedure.dto.js';
import type { UpdateProcedureDto } from '../dto/update-procedure.dto.js';

@Injectable()
export class ProcedureService {
  constructor(
    private readonly repository: ProcedureRepository,
    private readonly queries: ProcedureQueryService,
    private readonly prices: ProcedurePriceService,
  ) {}

  async create(dto: CreateProcedureDto): Promise<ProcedureEntity> {
    await this.assertNameAvailable(dto.name);

    const created = await this.repository.create({
      name: dto.name,
      description: dto.description ?? null,
      durationMinutes: dto.durationMinutes ?? null,
      ...(dto.unit ? { unit: dto.unit } : {}),
    });

    // O valor informado no cadastro vira a primeira vigência da série.
    if (dto.initialValueCents !== undefined) {
      await this.prices.add(created.id, { valueCents: dto.initialValueCents });
    }

    return toProcedureEntity(created, dto.initialValueCents ?? null);
  }

  async update(id: string, dto: UpdateProcedureDto): Promise<ProcedureEntity> {
    await this.queries.getById(id);
    const data: Prisma.ProcedureUpdateInput = {};

    if (dto.name !== undefined) {
      await this.assertNameAvailable(dto.name, id);
      data.name = dto.name;
    }
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.unit !== undefined) data.unit = dto.unit;
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes ?? null;

    await this.repository.update(id, data);
    return this.queries.getById(id);
  }

  /** Inativa sem excluir: procedimento já usado em agenda não pode desaparecer. */
  async inactivate(id: string): Promise<ProcedureEntity> {
    const atual = await this.queries.getById(id);
    if (!atual.active) throw new ConflictException('Procedimento já está inativo.');

    await this.repository.update(id, { active: false });
    return this.queries.getById(id);
  }

  async reactivate(id: string): Promise<ProcedureEntity> {
    const atual = await this.queries.getById(id);
    if (atual.active) throw new ConflictException('Procedimento já está ativo.');

    await this.repository.update(id, { active: true });
    return this.queries.getById(id);
  }

  private async assertNameAvailable(name: string, ignorarId?: string): Promise<void> {
    const existente = await this.repository.findByName(name);
    if (existente && existente.id !== ignorarId) {
      throw new ConflictException('Já existe procedimento com este nome.');
    }
  }
}

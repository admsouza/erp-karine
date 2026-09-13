import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ProcedureRepository } from '../repositories/procedure.repository.js';
import { ProcedureQueryService } from './procedure-query.service.js';
import { toProcedureEntity, type ProcedureEntity } from '../entities/procedure.entity.js';
import type { CreateProcedureDto } from '../dto/create-procedure.dto.js';
import type { UpdateProcedureDto } from '../dto/update-procedure.dto.js';

@Injectable()
export class ProcedureService {
  constructor(
    private readonly repository: ProcedureRepository,
    private readonly queries: ProcedureQueryService,
  ) {}

  async create(dto: CreateProcedureDto): Promise<ProcedureEntity> {
    await this.assertNameAvailable(dto.name);

    const created = await this.repository.create({
      name: dto.name,
      description: dto.description ?? null,
      durationMinutes: dto.durationMinutes ?? null,
      defaultValueCents: dto.defaultValueCents ?? 0,
    });

    return toProcedureEntity(created);
  }

  async update(id: string, dto: UpdateProcedureDto): Promise<ProcedureEntity> {
    const atual = await this.queries.getById(id);
    const data: Prisma.ProcedureUpdateInput = {};

    if (dto.name !== undefined) {
      if (dto.name !== atual.name) await this.assertNameAvailable(dto.name, id);
      data.name = dto.name;
    }
    if (dto.description !== undefined) data.description = dto.description ?? null;
    if (dto.durationMinutes !== undefined) data.durationMinutes = dto.durationMinutes ?? null;
    if (dto.defaultValueCents !== undefined) data.defaultValueCents = dto.defaultValueCents;

    const atualizado = await this.repository.update(id, data);
    return toProcedureEntity(atualizado);
  }

  /** Inativa sem excluir: procedimento já usado em agenda não pode desaparecer. */
  async inactivate(id: string): Promise<ProcedureEntity> {
    const atual = await this.queries.getById(id);
    if (!atual.active) throw new ConflictException('Procedimento já está inativo.');

    const atualizado = await this.repository.update(id, { active: false });
    return toProcedureEntity(atualizado);
  }

  async reactivate(id: string): Promise<ProcedureEntity> {
    const atual = await this.queries.getById(id);
    if (atual.active) throw new ConflictException('Procedimento já está ativo.');

    const atualizado = await this.repository.update(id, { active: true });
    return toProcedureEntity(atualizado);
  }

  private async assertNameAvailable(name: string, ignorarId?: string): Promise<void> {
    const existente = await this.repository.findByName(name);
    if (existente && existente.id !== ignorarId) {
      throw new ConflictException('Já existe procedimento com este nome.');
    }
  }
}

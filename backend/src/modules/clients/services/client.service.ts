import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { normalizeCpf } from '../../../common/validators/cpf.validator.js';
import { toClientEntity, type ClientEntity } from '../entities/client.entity.js';
import type { CreateClientDto } from '../dto/create-client.dto.js';
import type { UpdateClientDto } from '../dto/update-client.dto.js';
import { ClientRepository } from '../repositories/client.repository.js';
import { ClientQueryService } from './client-query.service.js';

/** Casos de uso de escrita do cliente: cadastrar, editar, inativar e reativar. */
@Injectable()
export class ClientService {
  constructor(
    private readonly repository: ClientRepository,
    private readonly queries: ClientQueryService,
  ) {}

  async create(dto: CreateClientDto): Promise<ClientEntity> {
    const cpf = this.normalizeOptionalCpf(dto.cpf);
    await this.assertCpfAvailable(cpf);

    const created = await this.repository.create({
      fullName: dto.fullName,
      cpf,
      birthDate: this.parseBirthDate(dto.birthDate) ?? null,
      phone: dto.phone ?? null,
      whatsapp: dto.whatsapp ?? null,
      email: dto.email ?? null,
      address: dto.address ?? null,
      notes: dto.notes ?? null,
    });

    return toClientEntity(created);
  }

  async update(id: string, dto: UpdateClientDto): Promise<ClientEntity> {
    const current = await this.queries.getById(id);
    const data: Prisma.ClientUpdateInput = {};

    if (dto.fullName !== undefined) {
      data.fullName = dto.fullName;
    }

    if (dto.cpf !== undefined) {
      const cpf = this.normalizeOptionalCpf(dto.cpf) ?? null;
      if (cpf !== current.cpf) {
        await this.assertCpfAvailable(cpf, id);
      }
      data.cpf = cpf;
    }

    if (dto.birthDate !== undefined) {
      data.birthDate = this.parseBirthDate(dto.birthDate) ?? null;
    }
    if (dto.phone !== undefined) data.phone = dto.phone ?? null;
    if (dto.whatsapp !== undefined) data.whatsapp = dto.whatsapp ?? null;
    if (dto.email !== undefined) data.email = dto.email ?? null;
    if (dto.address !== undefined) data.address = dto.address ?? null;
    if (dto.notes !== undefined) data.notes = dto.notes ?? null;

    const updated = await this.repository.update(id, data);
    return toClientEntity(updated);
  }

  /** Inativação é a alternativa à exclusão: o histórico do cliente continua íntegro. */
  async inactivate(id: string): Promise<ClientEntity> {
    const current = await this.queries.getById(id);
    if (!current.active) {
      throw new ConflictException('Cliente já está inativo.');
    }

    const updated = await this.repository.update(id, {
      active: false,
      deactivatedAt: new Date(),
    });
    return toClientEntity(updated);
  }

  async reactivate(id: string): Promise<ClientEntity> {
    const current = await this.queries.getById(id);
    if (current.active) {
      throw new ConflictException('Cliente já está ativo.');
    }

    const updated = await this.repository.update(id, {
      active: true,
      deactivatedAt: null,
    });
    return toClientEntity(updated);
  }

  private normalizeOptionalCpf(value?: string): string | null {
    if (!value) {
      return null;
    }
    const digits = normalizeCpf(value);
    return digits.length > 0 ? digits : null;
  }

  private parseBirthDate(value?: string): Date | null | undefined {
    if (value === undefined) {
      return undefined;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Data de nascimento inválida.');
    }
    if (date.getTime() > Date.now()) {
      throw new BadRequestException('Data de nascimento não pode ser futura.');
    }
    return date;
  }

  private async assertCpfAvailable(cpf: string | null, ignoreId?: string): Promise<void> {
    if (!cpf) {
      return;
    }
    const existing = await this.repository.findByCpf(cpf);
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Já existe um cliente com este CPF.');
    }
  }
}

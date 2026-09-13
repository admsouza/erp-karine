import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import {
  AuditTrailService,
  type AuditChange,
} from '../../audit/services/audit-trail.service.js';
import { mesmoNome } from '../../../common/utils/nome-normalizado.js';
import type { CreateProductDto } from '../dto/create-product.dto.js';
import type { UpdateProductDto } from '../dto/update-product.dto.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { toProductEntity } from '../entities/product.entity.js';

/**
 * Catálogo de produtos (o que a clínica vende além de procedimentos).
 *
 * Regras: nome único **sem diferenciar maiúsculas nem acentos**, sem exclusão física
 * (`active` + `deactivatedAt`) e trilha de auditoria pelo próprio caso de uso — o hub de
 * manutenção só consulta e delega, sem duplicar evento.
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly repository: ProductRepository,
    private readonly audit: AuditTrailService,
  ) {}

  async create(dto: CreateProductDto, user: AuthenticatedUser, requestId?: string) {
    await this.ensureNomeLivre(dto.name);
    const produto = await this.repository.create({
      name: dto.name,
      description: dto.description || null,
      unit: dto.unit || null,
      priceCents: dto.priceCents ?? 0,
    });
    await this.audit.record(
      {
        actorUserId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        module: 'products',
        entityType: 'Product',
        entityId: produto.id,
        action: 'CREATED',
        requestId,
        changes: [
          { field: 'name', before: null, after: produto.name },
          { field: 'priceCents', before: null, after: produto.priceCents },
        ],
      },
      undefined,
    );
    return toProductEntity(produto);
  }

  async update(id: string, dto: UpdateProductDto, user: AuthenticatedUser, requestId?: string) {
    const produto = await this.repository.findById(id);
    if (!produto) throw new NotFoundException('Produto não encontrado.');
    const data: Record<string, unknown> = {};
    const changes: AuditChange[] = [];
    if (dto.name !== undefined && dto.name !== produto.name) {
      await this.ensureNomeLivre(dto.name, id);
      data.name = dto.name;
      changes.push({ field: 'name', before: produto.name, after: dto.name });
    }
    if (dto.description !== undefined) {
      const descricao = dto.description || null;
      if (descricao !== produto.description) {
        data.description = descricao;
        changes.push({ field: 'description', before: produto.description, after: descricao });
      }
    }
    if (dto.unit !== undefined) {
      const unidade = dto.unit || null;
      if (unidade !== produto.unit) {
        data.unit = unidade;
        changes.push({ field: 'unit', before: produto.unit, after: unidade });
      }
    }
    if (dto.priceCents !== undefined && dto.priceCents !== produto.priceCents) {
      data.priceCents = dto.priceCents;
      changes.push({ field: 'priceCents', before: produto.priceCents, after: dto.priceCents });
    }
    if (!changes.length)
      throw new BadRequestException('Informe uma alteração diferente do valor atual.');
    const atualizado = await this.repository.update(id, data);
    await this.audit.record(
      {
        actorUserId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        module: 'products',
        entityType: 'Product',
        entityId: id,
        action: 'UPDATED',
        requestId,
        changes,
      },
      undefined,
    );
    return toProductEntity(atualizado);
  }

  async inactivate(id: string, user: AuthenticatedUser, requestId?: string) {
    return this.alternar(id, user, requestId, false);
  }

  async reactivate(id: string, user: AuthenticatedUser, requestId?: string) {
    return this.alternar(id, user, requestId, true);
  }

  private async alternar(
    id: string,
    user: AuthenticatedUser,
    requestId: string | undefined,
    ativar: boolean,
  ) {
    const produto = await this.repository.findById(id);
    if (!produto) throw new NotFoundException('Produto não encontrado.');
    if (produto.active === ativar)
      throw new ConflictException(
        ativar ? 'Produto já está ativo.' : 'Produto já está inativo.',
      );
    const atualizado = await this.repository.update(id, {
      active: ativar,
      deactivatedAt: ativar ? null : new Date(),
    });
    await this.audit.record(
      {
        actorUserId: user.id,
        actorName: user.name,
        actorEmail: user.email,
        module: 'products',
        entityType: 'Product',
        entityId: id,
        action: ativar ? 'REACTIVATED' : 'INACTIVATED',
        requestId,
        changes: [{ field: 'active', before: !ativar, after: ativar }],
      },
      undefined,
    );
    return toProductEntity(atualizado);
  }

  private async ensureNomeLivre(name: string, ignorarId?: string) {
    const repetido = (await this.repository.findAll()).some(
      (x) => x.id !== ignorarId && mesmoNome(x.name, name),
    );
    if (repetido) throw new ConflictException('Já existe um produto com esse nome.');
  }
}

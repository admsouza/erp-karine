import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { CashRepository } from '../repositories/cash.repository.js';
import type {
  CreateResourceAccountDto,
  UpdateResourceAccountDto,
} from '../dto/cash.dto.js';
import {
  AuditTrailService,
  type AuditChange,
} from '../../audit/services/audit-trail.service.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { monthBounds } from './cash-period.service.js';
import { mesmoNome } from '../entities/resource-name.js';
@Injectable()
export class ResourceAccountService {
  constructor(
    private readonly repository: CashRepository,
    private readonly audit: AuditTrailService,
  ) {}
  list() {
    return this.repository.accounts();
  }
  create(
    dto: CreateResourceAccountDto,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      if (
        (await this.repository.accounts(tx)).some((x) =>
          mesmoNome(x.name, dto.name),
        )
      )
        throw new ConflictException('Local de recurso já cadastrado.');
      const account = await this.repository.createAccount(dto, tx);
      for (const period of await this.repository.periods(tx))
        if (!period.closedAt)
          await this.repository.createBalance(
            { periodId: period.id, accountId: account.id, openingCents: 0 },
            tx,
          );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'ResourceAccount',
          entityId: account.id,
          action: 'CREATED',
          requestId,
          changes: [
            { field: 'name', before: null, after: account.name },
            { field: 'kind', before: null, after: account.kind },
          ],
        },
        tx,
      );
      return account;
    });
  }
  /** Corrige a identificação do local. Os valores não se movem: o saldo é ligado ao id. */
  update(
    id: string,
    dto: UpdateResourceAccountDto,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      const account = await this.repository.account(id, tx);
      if (!account)
        throw new NotFoundException('Local de recurso não encontrado.');
      const data: Prisma.ResourceAccountUpdateInput = {};
      const changes: AuditChange[] = [];
      if (dto.name && dto.name !== account.name) {
        if (
          (await this.repository.accounts(tx)).some(
            (x) => x.id !== id && mesmoNome(x.name, dto.name!),
          )
        )
          throw new ConflictException('Já existe um local com esse nome.');
        data.name = dto.name;
        changes.push({ field: 'name', before: account.name, after: dto.name });
      }
      if (dto.kind && dto.kind !== account.kind) {
        data.kind = dto.kind;
        changes.push({ field: 'kind', before: account.kind, after: dto.kind });
      }
      if (!changes.length)
        throw new BadRequestException(
          'Informe uma alteração diferente do valor atual.',
        );
      const updated = await this.repository.updateAccount(id, data, tx);
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'ResourceAccount',
          entityId: id,
          action: 'UPDATED',
          requestId,
          changes,
        },
        tx,
      );
      return updated;
    });
  }
  /**
   * Tira o local das listas de novos lançamentos e de novas aberturas **sem apagar histórico**:
   * os meses fechados continuam com a composição. Local com lançamento no mês aberto não pode
   * ser inativado — o fechamento daquele mês perderia a composição.
   */
  inactivate(id: string, user: AuthenticatedUser, requestId?: string) {
    return this.repository.transaction(async (tx) => {
      const account = await this.repository.account(id, tx);
      if (!account)
        throw new NotFoundException('Local de recurso não encontrado.');
      if (!account.active)
        throw new ConflictException('Local de recurso já está inativo.');
      for (const period of await this.repository.periods(tx)) {
        if (period.closedAt) continue;
        const { from, to } = monthBounds(period.month);
        const movimentos = (await this.repository.movements(from, to, tx)).filter(
          (x) => x.resourceAccountId === id,
        );
        if (movimentos.length)
          throw new ConflictException(
            'Local com lançamento no mês aberto: ajuste ou cancele antes de inativar.',
          );
        await this.repository.deleteBalances(period.id, id, tx);
      }
      const updated = await this.repository.updateAccount(
        id,
        { active: false, deactivatedAt: new Date() },
        tx,
      );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'ResourceAccount',
          entityId: id,
          action: 'INACTIVATED',
          requestId,
          changes: [{ field: 'active', before: true, after: false }],
        },
        tx,
      );
      return updated;
    });
  }
  reactivate(id: string, user: AuthenticatedUser, requestId?: string) {
    return this.repository.transaction(async (tx) => {
      const account = await this.repository.account(id, tx);
      if (!account)
        throw new NotFoundException('Local de recurso não encontrado.');
      if (account.active)
        throw new ConflictException('Local de recurso já está ativo.');
      const updated = await this.repository.updateAccount(
        id,
        { active: true, deactivatedAt: null },
        tx,
      );
      for (const period of await this.repository.periods(tx))
        if (!period.closedAt)
          await this.repository.createBalance(
            { periodId: period.id, accountId: id, openingCents: 0 },
            tx,
          );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'ResourceAccount',
          entityId: id,
          action: 'REACTIVATED',
          requestId,
          changes: [{ field: 'active', before: false, after: true }],
        },
        tx,
      );
      return updated;
    });
  }
}

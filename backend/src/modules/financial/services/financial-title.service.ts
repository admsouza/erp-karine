import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import type {
  CreateFinancialTitleDto,
  ListFinancialTitlesDto,
  SettleFinancialTitleDto,
} from '../dto/financial-title.dto.js';
import { FinancialTitleRepository } from '../repositories/financial-title.repository.js';
import { FinancialTransactionRepository } from '../repositories/financial-transaction.repository.js';
import { CashPolicyService } from './cash-policy.service.js';
function withStatus<
  T extends {
    amountCents: number;
    cancelledAt: Date | null;
    dueDate: Date;
    settlements: { amountCents: number }[];
  },
>(item: T) {
  const paidCents = item.settlements.reduce((sum, x) => sum + x.amountCents, 0);
  const remainingCents = item.amountCents - paidCents;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Recife',
  }).format(new Date());
  return {
    ...item,
    paidCents,
    remainingCents,
    status: item.cancelledAt
      ? 'CANCELADO'
      : remainingCents === 0
        ? 'PAGO'
        : paidCents > 0
          ? 'PARCIAL'
          : 'PENDENTE',
    overdue:
      !item.cancelledAt &&
      remainingCents > 0 &&
      item.dueDate.toISOString().slice(0, 10) < today,
  };
}
@Injectable()
export class FinancialTitleService {
  constructor(
    private readonly repository: FinancialTitleRepository,
    private readonly transactions: FinancialTransactionRepository,
    private readonly policy: CashPolicyService,
    private readonly audit: AuditTrailService,
  ) {}
  async list(q: ListFinancialTitlesDto) {
    const [items, total] = await Promise.all([
      this.repository.list(q),
      this.repository.count(q),
    ]);
    return {
      items: items.map(withStatus),
      total,
      page: q.page,
      pageSize: q.pageSize,
    };
  }
  async get(id: string) {
    const item = await this.repository.find(id);
    if (!item) throw new NotFoundException('Conta não encontrada.');
    return withStatus(item);
  }
  create(
    dto: CreateFinancialTitleDto,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      const item = await this.repository.create(
        { ...dto, dueDate: new Date(dto.dueDate) },
        tx,
      );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'FinancialTitle',
          entityId: item.id,
          action: 'CREATED',
          requestId,
          changes: [
            { field: 'amountCents', before: null, after: item.amountCents },
            { field: 'dueDate', before: null, after: dto.dueDate },
            { field: 'type', before: null, after: dto.type },
          ],
        },
        tx,
      );
      return item;
    });
  }
  settle(
    id: string,
    dto: SettleFinancialTitleDto,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      const date = new Date(
        dto.date.length === 10 ? `${dto.date}T12:00:00-03:00` : dto.date,
      );
      const existing = await this.repository.settlementByKey(
        dto.idempotencyKey,
        tx,
      );
      if (existing) {
        if (
          existing.titleId !== id ||
          existing.amountCents !== dto.amountCents ||
          existing.resourceAccountId !== dto.resourceAccountId ||
          existing.paymentMethod !== dto.paymentMethod ||
          existing.date.getTime() !== date.getTime()
        )
          throw new ConflictException(
            'Chave de idempotência já utilizada com outros dados.',
          );
        return existing;
      }
      const title = await this.repository.find(id, tx);
      if (!title) throw new NotFoundException('Conta não encontrada.');
      if (title.cancelledAt) throw new ConflictException('Conta cancelada.');
      const remaining =
        title.amountCents -
        title.settlements.reduce((sum, x) => sum + x.amountCents, 0);
      if (dto.amountCents > remaining)
        throw new ConflictException('Valor excede o saldo em aberto.');
      await this.policy.assertWritable(date, tx);
      await this.policy.assertAccount(dto.resourceAccountId, tx);
      const movement = await this.transactions.create(
        {
          description: title.description,
          amountCents: dto.amountCents,
          date,
          resourceAccountId: dto.resourceAccountId,
          paymentMethod: dto.paymentMethod,
          type: title.type,
          origin: 'MANUAL',
          status: 'PAGO',
          category:
            title.type === 'RECEITA' ? 'Contas a receber' : 'Contas a pagar',
        },
        tx,
      );
      const settlement = await this.repository.createSettlement(
        { ...dto, date, titleId: id, transactionId: movement.id },
        tx,
      );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'FinancialTitle',
          entityId: id,
          action: title.type === 'RECEITA' ? 'RECEIVED' : 'PAID',
          requestId,
          changes: [
            {
              field: 'remainingCents',
              before: remaining,
              after: remaining - dto.amountCents,
            },
            { field: 'transactionId', before: null, after: movement.id },
            {
              field: 'resourceAccountId',
              before: null,
              after: dto.resourceAccountId,
            },
          ],
        },
        tx,
      );
      return settlement;
    });
  }
  cancel(
    id: string,
    reason: string,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      const item = await this.repository.find(id, tx);
      if (!item) throw new NotFoundException('Conta não encontrada.');
      if (item.cancelledAt || item.settlements.length)
        throw new ConflictException('Só é possível cancelar conta sem baixas.');
      const result = await this.repository.cancel(id, tx);
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'FinancialTitle',
          entityId: id,
          action: 'CANCELLED',
          reason,
          requestId,
          changes: [
            { field: 'status', before: 'PENDENTE', after: 'CANCELADO' },
          ],
        },
        tx,
      );
      return result;
    });
  }
}

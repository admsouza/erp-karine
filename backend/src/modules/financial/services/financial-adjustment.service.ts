import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import type { CreateAdjustmentDto } from '../dto/adjustment.dto.js';
import { CashRepository } from '../repositories/cash.repository.js';
import { FinancialTransactionRepository } from '../repositories/financial-transaction.repository.js';
import { CashPolicyService } from './cash-policy.service.js';
import { monthBounds } from './cash-period.service.js';
@Injectable()
export class FinancialAdjustmentService {
  constructor(
    private readonly cash: CashRepository,
    private readonly repository: FinancialTransactionRepository,
    private readonly policy: CashPolicyService,
    private readonly audit: AuditTrailService,
  ) {}
  create(
    id: string,
    dto: CreateAdjustmentDto,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.cash.transaction(async (tx) => {
      const date = new Date(
        dto.date.length === 10 ? `${dto.date}T12:00:00-03:00` : dto.date,
      );
      const previous = await this.repository.findByKey(dto.idempotencyKey, tx);
      if (previous) {
        if (
          previous.adjustmentOfId !== id ||
          previous.amountCents !== dto.amountCents ||
          previous.date.getTime() !== date.getTime() ||
          previous.resourceAccountId !== dto.resourceAccountId ||
          previous.type !== dto.type ||
          previous.paymentMethod !== dto.paymentMethod ||
          previous.description !== dto.description ||
          previous.notes !== dto.reason
        )
          throw new ConflictException('Chave já utilizada com outro ajuste.');
        return previous;
      }
      const original = await this.repository.findById(id, tx);
      if (!original)
        throw new NotFoundException('Lançamento original não encontrado.');
      if (original.status !== 'PAGO')
        throw new ConflictException('Ajuste exige lançamento pago.');
      const periods = await this.cash.periods(tx);
      if (
        !periods.some((p) => {
          const { from, to } = monthBounds(p.month);
          return !p.closedAt && date >= from && date < to;
        })
      )
        throw new ConflictException(
          'O ajuste deve ser registrado em caixa aberto.',
        );
      await this.policy.assertWritable(date, tx);
      await this.policy.assertAccount(dto.resourceAccountId, tx);
      const { reason, ...data } = dto;
      const item = await this.repository.create(
        {
          ...data,
          date,
          adjustmentOfId: id,
          status: 'PAGO',
          origin: 'MANUAL',
          category: 'Ajuste',
          notes: reason,
        },
        tx,
      );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'FinancialTransaction',
          entityId: item.id,
          action: 'ADJUSTMENT_CREATED',
          reason,
          requestId,
          changes: [
            { field: 'adjustmentOfId', before: null, after: id },
            { field: 'amountCents', before: null, after: dto.amountCents },
            { field: 'type', before: null, after: dto.type },
            {
              field: 'resourceAccountId',
              before: null,
              after: dto.resourceAccountId,
            },
          ],
        },
        tx,
      );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'FinancialTransaction',
          entityId: id,
          action: 'ADJUSTMENT_LINKED',
          reason,
          requestId,
          changes: [{ field: 'adjustmentId', before: null, after: item.id }],
        },
        tx,
      );
      return item;
    });
  }
}

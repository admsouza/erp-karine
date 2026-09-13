import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import type { CreateReconciliationDto } from '../dto/cash.dto.js';
import { CashRepository } from '../repositories/cash.repository.js';
import { ReconciliationRepository } from '../repositories/reconciliation.repository.js';
import { monthBounds } from './cash-period.service.js';
import { balanceTotals } from '../entities/cash-balance.js';
@Injectable()
export class ReconciliationService {
  constructor(
    private readonly cash: CashRepository,
    private readonly repository: ReconciliationRepository,
    private readonly audit: AuditTrailService,
  ) {}
  list(periodId: string) {
    return this.repository.list(periodId);
  }
  create(
    dto: CreateReconciliationDto,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.cash.transaction(async (tx) => {
      const period = await this.cash.period(dto.periodId, tx);
      if (!period) throw new NotFoundException('Caixa não encontrado.');
      const balance = period.balances.find(
        (b) => b.accountId === dto.accountId,
      );
      if (!balance)
        throw new BadRequestException('Local não pertence ao caixa.');
      const { from, to } = monthBounds(period.month);
      const movements = await this.cash.movements(from, to);
      if (movements.some((x) => !x.resourceAccountId))
        throw new ConflictException(
          'Defina os locais dos lançamentos antes de conciliar.',
        );
      const expectedCents = period.closedAt
        ? balance.expectedCents
        : balanceTotals(
            balance.openingCents,
            movements.filter((x) => x.resourceAccountId === dto.accountId),
          ).expectedCents;
      const differenceCents = dto.amountCents - expectedCents;
      if (Math.abs(differenceCents) > 2_000_000_000)
        throw new BadRequestException('Divergência excede o limite suportado.');
      const result = await this.repository.create(
        {
          periodId: period.id,
          accountId: dto.accountId,
          expectedCents,
          countedCents: dto.amountCents,
          differenceCents,
          reason: dto.reason,
        },
        tx,
      );
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'FinancialReconciliation',
          entityId: result.id,
          action: 'RECONCILED',
          reason: dto.reason,
          requestId,
          changes: [
            { field: 'expectedCents', before: null, after: expectedCents },
            { field: 'countedCents', before: null, after: dto.amountCents },
            { field: 'differenceCents', before: null, after: differenceCents },
          ],
        },
        tx,
      );
      return result;
    });
  }
}

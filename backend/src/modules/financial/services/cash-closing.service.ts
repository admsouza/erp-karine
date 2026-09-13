import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import type { CloseCashPeriodDto } from '../dto/cash.dto.js';
import { CashRepository } from '../repositories/cash.repository.js';
import { monthBounds } from './cash-period.service.js';
import { balanceTotals } from '../entities/cash-balance.js';
@Injectable()
export class CashClosingService {
  constructor(
    private readonly repository: CashRepository,
    private readonly audit: AuditTrailService,
  ) {}
  close(
    id: string,
    dto: CloseCashPeriodDto,
    user: AuthenticatedUser,
    requestId?: string,
  ) {
    return this.repository.transaction(async (tx) => {
      const period = await this.repository.period(id, tx);
      if (!period) throw new NotFoundException('Caixa não encontrado.');
      if (period.closedAt) throw new ConflictException('Caixa já fechado.');
      if (
        dto.balances.length !== period.balances.length ||
        new Set(dto.balances.map((x) => x.accountId)).size !==
          dto.balances.length ||
        period.balances.some(
          (b) => !dto.balances.some((x) => x.accountId === b.accountId),
        )
      )
        throw new BadRequestException(
          'Informe o saldo apurado de todos os locais, sem repetição.',
        );
      const { from, to } = monthBounds(period.month);
      const movements = await this.repository.movements(from, to);
      if (movements.some((x) => !x.resourceAccountId))
        throw new ConflictException(
          'Defina o local dos lançamentos sem destino antes de fechar.',
        );
      for (const balance of period.balances) {
        const totals = balanceTotals(
          balance.openingCents,
          movements.filter((x) => x.resourceAccountId === balance.accountId),
        );
        const countedCents = dto.balances.find(
          (x) => x.accountId === balance.accountId,
        )!.amountCents;
        const differenceCents = countedCents - totals.expectedCents;
        if (Math.abs(differenceCents) > 2_000_000_000)
          throw new BadRequestException(
            'Divergência excede o limite suportado.',
          );
        await this.repository.updateBalance(
          balance.id,
          { ...totals, countedCents, differenceCents },
          tx,
        );
        await this.audit.record(
          {
            actorUserId: user.id,
            actorName: user.name,
            actorEmail: user.email,
            module: 'financial',
            entityType: 'CashPeriod',
            entityId: id,
            action: 'BALANCE_COUNTED',
            requestId,
            reason: dto.reason,
            changes: [
              {
                field: `${balance.accountId}.expectedCents`,
                before: null,
                after: totals.expectedCents,
              },
              {
                field: `${balance.accountId}.countedCents`,
                before: null,
                after: countedCents,
              },
              {
                field: `${balance.accountId}.differenceCents`,
                before: null,
                after: differenceCents,
              },
            ],
          },
          tx,
        );
      }
      return this.repository.closePeriod(id, tx);
    });
  }
}

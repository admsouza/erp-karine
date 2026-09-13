import { balanceTotals } from '../entities/cash-balance.js';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import type { OpenCashPeriodDto } from '../dto/cash.dto.js';
import { CashRepository } from '../repositories/cash.repository.js';
export function monthBounds(month: string) {
  const [year, m] = month.split('-').map(Number);
  const next = `${m === 12 ? year + 1 : year}-${String(m === 12 ? 1 : m + 1).padStart(2, '0')}`;
  return {
    from: new Date(`${month}-01T00:00:00-03:00`),
    to: new Date(`${next}-01T00:00:00-03:00`),
    next,
  };
}
@Injectable()
export class CashPeriodService {
  constructor(
    private readonly repository: CashRepository,
    private readonly audit: AuditTrailService,
  ) {}
  list() {
    return this.repository.periods();
  }
  async detail(id: string) {
    const period = await this.repository.period(id);
    if (!period) throw new NotFoundException('Caixa não encontrado.');
    if (period.closedAt) return period;
    const { from, to } = monthBounds(period.month);
    const movements = await this.repository.movements(from, to);
    return {
      ...period,
      unassignedCount: movements.filter((x) => !x.resourceAccountId).length,
      balances: period.balances.map((balance) => {
        const items = movements.filter(
          (x) => x.resourceAccountId === balance.accountId,
        );
        return { ...balance, ...balanceTotals(balance.openingCents, items) };
      }),
    };
  }
  open(dto: OpenCashPeriodDto, user: AuthenticatedUser, requestId?: string) {
    return this.repository.transaction(async (tx) => {
      const periods = await this.repository.periods(tx);
      const last = periods[0];
      if (periods.some((x) => x.month === dto.month))
        throw new ConflictException('Já existe caixa para este período.');
      if (
        last &&
        (!last.closedAt || monthBounds(last.month).next !== dto.month)
      )
        throw new ConflictException(
          'Feche o último período e abra o mês seguinte.',
        );
      if (last && dto.initialBalances?.length)
        throw new BadRequestException(
          'Saldos iniciais são transportados automaticamente.',
        );
      const accounts = await this.repository.accounts(tx);
      if (!accounts.length)
        throw new ConflictException(
          'Cadastre um local de recurso antes de abrir o caixa.',
        );
      const initial = dto.initialBalances ?? [];
      if (
        new Set(initial.map((x) => x.accountId)).size !== initial.length ||
        initial.some((x) => !accounts.some((a) => a.id === x.accountId))
      )
        throw new BadRequestException('Locais inválidos ou repetidos.');
      const period = await this.repository.createPeriod(
        { month: dto.month },
        tx,
      );
      const openingChanges: { field: string; before: null; after: number }[] =
        [];
      for (const account of accounts) {
        const openingCents =
          last?.balances.find((x) => x.accountId === account.id)
            ?.countedCents ??
          initial.find((x) => x.accountId === account.id)?.amountCents ??
          0;
        await this.repository.createBalance(
          { periodId: period.id, accountId: account.id, openingCents },
          tx,
        );
        openingChanges.push({
          field: `${account.id}.openingCents`,
          before: null,
          after: openingCents,
        });
      }
      await this.audit.record(
        {
          actorUserId: user.id,
          actorName: user.name,
          actorEmail: user.email,
          module: 'financial',
          entityType: 'CashPeriod',
          entityId: period.id,
          action: 'OPENED',
          requestId,
          changes: [
            { field: 'month', before: null, after: dto.month },
            ...openingChanges,
          ],
        },
        tx,
      );
      return period;
    });
  }
}

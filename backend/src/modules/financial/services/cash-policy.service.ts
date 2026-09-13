import { ConflictException, Injectable } from '@nestjs/common';
import type { Prisma } from '../../../generated/prisma/client.js';
import { CashRepository } from '../repositories/cash.repository.js';
import { monthBounds } from './cash-period.service.js';
@Injectable()
export class CashPolicyService {
  constructor(private readonly repository: CashRepository) {}
  async assertWritable(date: Date, tx: Prisma.TransactionClient) {
    await this.repository.lock(tx);
    const periods = await this.repository.periods(tx);
    if (
      periods.some((p) => {
        const { from, to } = monthBounds(p.month);
        return p.closedAt && date >= from && date < to;
      })
    )
      throw new ConflictException(
        'Caixa do período fechado. Registre ajuste em período aberto com motivo.',
      );
  }
  async assertAccount(id: string, tx: Prisma.TransactionClient) {
    if (
      !(await this.repository.accounts(tx)).some((a) => a.id === id && a.active)
    )
      throw new ConflictException('Local de recurso indisponível.');
  }
}

import { ConflictException, Injectable } from '@nestjs/common';
import { CashRepository } from '../repositories/cash.repository.js';
import type { CreateResourceAccountDto } from '../dto/cash.dto.js';
import { AuditTrailService } from '../../audit/services/audit-trail.service.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
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
        (await this.repository.accounts(tx)).some(
          (x) => x.name.toLowerCase() === dto.name.toLowerCase(),
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
}

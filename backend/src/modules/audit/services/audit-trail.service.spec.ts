import { describe, expect, it, vi } from 'vitest';
import { AuditTrailService } from './audit-trail.service.js';

describe('AuditTrailService', () => {
  it('grava evento imutável e lista timeline mais recente primeiro', async () => {
    const repository = { create: vi.fn().mockResolvedValue({ id: 'audit-1' }), list: vi.fn().mockResolvedValue({ items: [{ id: 'audit-1' }], total: 1 }) };
    const service = new AuditTrailService(repository as never);
    await service.record({ actorUserId: 'user-1', actorName: 'Maria', actorEmail: 'maria@example.com', module: 'subscriptions', entityType: 'SubscriptionPayment', entityId: 'payment-1', action: 'UPDATED', requestId: 'req-1', reason: 'Correção', changes: [{ field: 'amountCents', before: 100, after: 200 }] });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ changes: [{ field: 'amountCents', before: 100, after: 200 }] }), undefined);
    expect(await service.timeline('SubscriptionPayment', 'payment-1', 1, 20)).toMatchObject({ total: 1 });
  });
});
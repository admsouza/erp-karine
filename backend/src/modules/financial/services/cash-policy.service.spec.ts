import { describe, it, expect, vi } from 'vitest';
import { CashPolicyService } from './cash-policy.service.js';
describe('Proteção do caixa fechado', () => {
  const repository = {
    lock: vi.fn(),
    periods: vi.fn(async () => [{ month: '2026-09', closedAt: new Date() }]),
  };
  const service = new CashPolicyService(repository as never);
  it('bloqueia último instante do mês em Recife e libera início do seguinte', async () => {
    await expect(
      service.assertWritable(new Date('2026-10-01T02:59:59Z'), {} as never),
    ).rejects.toThrow('fechado');
    await expect(
      service.assertWritable(new Date('2026-10-01T03:00:00Z'), {} as never),
    ).resolves.toBeUndefined();
  });
});

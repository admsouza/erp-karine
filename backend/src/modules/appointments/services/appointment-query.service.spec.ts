import { describe, expect, it, vi } from 'vitest';
import { AppointmentQueryService } from './appointment-query.service.js';

describe('AppointmentQueryService', () => {
  it('consulta a agenda diária no intervalo do dia da clínica', async () => {
    const repository = { findMany: vi.fn().mockResolvedValue([]) };
    const service = new AppointmentQueryService(repository as never, { getById: vi.fn() } as never);

    await service.daily('2026-09-20');

    expect(repository.findMany).toHaveBeenCalledWith(expect.objectContaining({
      from: new Date('2026-09-20T00:00:00-03:00'),
      to: new Date('2026-09-21T00:00:00-03:00'),
    }));
  });
});
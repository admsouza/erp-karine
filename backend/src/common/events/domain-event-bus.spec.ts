import { describe, it, expect, vi } from 'vitest';
import { DomainEventBus } from './domain-event-bus.js';
describe('Evento na transação do caso de uso', () => {
  it('propaga a transação e a falha para permitir rollback', async () => {
    const bus = new DomainEventBus();
    const tx = {} as never;
    const handler = vi.fn(async (_event, _tx) => {
      if (_tx !== tx) throw new Error('Transação não propagada');
      throw new Error('Rejeição financeira');
    });
    bus.subscribe('Received', handler);
    await expect(bus.publish({ name: 'Received' }, tx)).rejects.toThrow(
      'Rejeição financeira',
    );
    expect(handler).toHaveBeenCalledWith({ name: 'Received' }, tx);
  });
});

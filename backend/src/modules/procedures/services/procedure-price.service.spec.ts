import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProcedurePriceService } from './procedure-price.service.js';
import type { ProcedureQueryService } from './procedure-query.service.js';
import type { ProcedurePriceRepository } from '../repositories/procedure-price.repository.js';

const HOJE = new Date('2026-09-13T00:00:00.000Z');
const ANTERIOR = new Date('2026-01-01T00:00:00.000Z');

function vigencia(overrides: Record<string, unknown> = {}) {
  return {
    id: 'price-1',
    procedureId: 'proc-1',
    valueCents: 18000,
    validFrom: ANTERIOR,
    validTo: null,
    note: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function montar(ultima: unknown = vigencia(), total = 1) {
  const repository = {
    create: vi.fn().mockImplementation((data: Record<string, unknown>) => Promise.resolve(vigencia(data))),
    findByProcedure: vi.fn().mockResolvedValue([ultima]),
    findLatest: vi.fn().mockResolvedValue(ultima),
    findById: vi.fn().mockResolvedValue(ultima),
    findByValidFrom: vi.fn().mockResolvedValue(null),
    findOn: vi.fn().mockResolvedValue(ultima),
    findOpenByProcedureIds: vi.fn().mockResolvedValue([ultima]),
    countByProcedure: vi.fn().mockResolvedValue(total),
    delete: vi.fn().mockResolvedValue(ultima),
    closeOpen: vi.fn().mockResolvedValue(undefined),
    reopen: vi.fn().mockImplementation((id: string, validFrom: Date) =>
      Promise.resolve(vigencia({ id, validFrom, validTo: null })),
    ),
  } as unknown as ProcedurePriceRepository;

  const procedures = {
    getById: vi.fn().mockResolvedValue({ id: 'proc-1', name: 'Botox' }),
    findById: vi.fn().mockResolvedValue({ id: 'proc-1' }),
  } as unknown as ProcedureQueryService;

  return { service: new ProcedurePriceService(repository, procedures), repository, procedures };
}

describe('ProcedurePriceService', () => {
  beforeEach(() => vi.useRealTimers());

  it('novo valor fecha a vigência anterior no início da nova', async () => {
    const { service, repository } = montar();
    const criada = await service.add('proc-1', { valueCents: 20000, validFrom: '2026-09-13' });

    expect(criada.valueCents).toBe(20000);
    expect(repository.closeOpen).toHaveBeenCalledWith('proc-1', new Date('2026-09-13T00:00:00.000Z'));
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ valueCents: 20000, validFrom: new Date('2026-09-13T00:00:00.000Z') }),
    );
  });

  it('recusa vigência que começa antes ou no mesmo dia da mais recente', async () => {
    const { service } = montar(vigencia({ validFrom: HOJE }));
    await expect(service.add('proc-1', { valueCents: 20000, validFrom: '2026-09-13' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('recusa data de vigência repetida', async () => {
    const { service, repository } = montar();
    repository.findByValidFrom = vi.fn().mockResolvedValue(vigencia({ validFrom: HOJE }));

    await expect(service.add('proc-1', { valueCents: 20000, validFrom: '2026-09-13' })).rejects.toThrow(
      ConflictException,
    );
  });

  it('sem data informada, a vigência começa hoje', async () => {
    const { service, repository } = montar(vigencia({ validFrom: ANTERIOR }));
    await service.add('proc-1', { valueCents: 20000 });

    const hoje = new Date();
    const esperado = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
    const usada = (repository.closeOpen as unknown as { mock: { calls: unknown[][] } }).mock.calls[0][1] as Date;
    expect(Math.abs(usada.getTime() - esperado.getTime())).toBeLessThanOrEqual(24 * 60 * 60 * 1000);
  });

  it('não permite remover o único valor do procedimento', async () => {
    const { service } = montar(vigencia(), 1);
    await expect(service.remove('proc-1', 'price-1')).rejects.toThrow(ConflictException);
  });

  it('ao remover a vigência atual, a anterior volta a valer', async () => {
    const { service, repository } = montar(vigencia({ validTo: null }), 2);
    await service.remove('proc-1', 'price-1');

    expect(repository.delete).toHaveBeenCalledWith('price-1');
    expect(repository.reopen).toHaveBeenCalled();
  });

  it('remover vigência antiga não reabre nada', async () => {
    const antiga = vigencia({ validTo: HOJE });
    const { service, repository } = montar(antiga, 2);
    await service.remove('proc-1', 'price-1');

    expect(repository.delete).toHaveBeenCalledWith('price-1');
    expect(repository.reopen).not.toHaveBeenCalled();
  });

  it('recusa vigência de outro procedimento', async () => {
    const { service } = montar(vigencia({ procedureId: 'outro' }), 2);
    await expect(service.remove('proc-1', 'price-1')).rejects.toThrow(NotFoundException);
  });

  it('corrige o valor da vigência atual', async () => {
    const { service, repository } = montar(vigencia({ validTo: null }), 2);
    repository.update = vi.fn().mockImplementation((_id: string, data: Record<string, unknown>) =>
      Promise.resolve(vigencia({ ...data })),
    );

    const corrigida = await service.update('proc-1', 'price-1', { valueCents: 22000, note: 'Valor correto' });
    expect(corrigida.valueCents).toBe(22000);
    expect(repository.update).toHaveBeenCalledWith('price-1', { valueCents: 22000, note: 'Valor correto' });
  });

  it('recusa editar vigência já encerrada (histórico não é reescrito)', async () => {
    const { service } = montar(vigencia({ validTo: new Date('2026-09-20T00:00:00.000Z') }), 2);
    await expect(service.update('proc-1', 'price-1', { valueCents: 22000 })).rejects.toThrow(ConflictException);
  });

  it('exige valor ou observação na correção', async () => {
    const { service } = montar(vigencia({ validTo: null }), 2);
    await expect(service.update('proc-1', 'price-1', {})).rejects.toThrow(BadRequestException);
  });

  it('recusa corrigir vigência de outro procedimento', async () => {
    const { service } = montar(vigencia({ procedureId: 'outro', validTo: null }), 2);
    await expect(service.update('proc-1', 'price-1', { valueCents: 1000 })).rejects.toThrow(NotFoundException);
  });

  it('valueOn devolve o valor da vigência que valia na data', async () => {
    const { service } = montar(vigencia({ valueCents: 75000 }), 2);
    expect(await service.valueOn('proc-1', HOJE)).toBe(75000);
  });

  it('devolve mapa de valores vigentes para a listagem', async () => {
    const { service } = montar(vigencia({ valueCents: 90000 }), 3);
    const mapa = await service.currentValuesOf(['proc-1']);

    expect(mapa.get('proc-1')).toBe(90000);
  });
});

import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProtocolService } from './protocol.service.js';

function setup() {
  const repository = {
    create: vi.fn(), findById: vi.fn(), update: vi.fn(), createSession: vi.fn(), findSessionByAppointmentId: vi.fn(),
  };
  const clients = { getById: vi.fn() };
  const procedures = { getById: vi.fn() };
  const appointments = { getById: vi.fn() };
  return { service: new ProtocolService(repository as never, clients as never, procedures as never, appointments as never), repository, clients, procedures, appointments };
}

describe('ProtocolService', () => {
  it('abre protocolo somente para cliente ativo e preserva snapshot do procedimento', async () => {
    const { service, repository, clients, procedures } = setup();
    clients.getById.mockResolvedValue({ id: 'c', fullName: 'Ana', active: true });
    procedures.getById.mockResolvedValue({ id: 'p', name: 'Laser', active: true });
    repository.create.mockImplementation((data) => ({ id: 'x', ...data, active: true, status: 'EM_ANDAMENTO' }));
    const result = await service.create({ clientId: 'c', procedureId: 'p', date: '2026-09-13', title: 'Protocolo facial' });
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ clientName: 'Ana', procedureName: 'Laser' }));
    expect(result.status).toBe('EM_ANDAMENTO');
  });

  it('recusa abrir protocolo para cliente inativo', async () => {
    const { service, clients } = setup();
    clients.getById.mockResolvedValue({ active: false });
    await expect(service.create({ clientId: 'c', date: '2026-09-13', title: 'Protocolo facial' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('acrescenta sessão com snapshots e não altera sessão anterior', async () => {
    const { service, repository, procedures, appointments } = setup();
    repository.findById.mockResolvedValue({ id: 'x', clientId: 'c', active: true, status: 'EM_ANDAMENTO' });
    appointments.getById.mockResolvedValue({ id: 'a', clientId: 'c', procedureId: 'p', procedureName: 'Laser histórico', status: 'REALIZADO' });
    procedures.getById.mockResolvedValue({ id: 'p', name: 'Laser atual' });
    repository.findSessionByAppointmentId.mockResolvedValue(null);
    repository.createSession.mockImplementation((data) => ({ id: 's', ...data }));
    await service.addSession('x', { date: '2026-09-13', appointmentId: 'a', procedureId: 'p', procedurePerformed: 'Laser facial', evolution: 'Boa resposta' });
    expect(repository.createSession).toHaveBeenCalledWith(expect.objectContaining({ appointmentId: 'a', appointmentSnapshot: 'Laser histórico', procedureName: 'Laser atual' }));
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('impede reutilizar o mesmo atendimento em duas sessões', async () => {
    const { service, repository, appointments } = setup();
    repository.findById.mockResolvedValue({ id: 'x', clientId: 'c', active: true, status: 'EM_ANDAMENTO' });
    repository.findSessionByAppointmentId.mockResolvedValue({ id: 'existente' });
    appointments.getById.mockResolvedValue({ clientId: 'c', status: 'REALIZADO' });
    await expect(service.addSession('x', { date: '2026-09-13', appointmentId: 'a', procedurePerformed: 'Laser' })).rejects.toBeInstanceOf(ConflictException);
  });

  it('não permite nova sessão em protocolo concluído', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue({ id: 'x', active: true, status: 'CONCLUIDO' });
    await expect(service.addSession('x', { date: '2026-09-13', procedurePerformed: 'Laser' })).rejects.toBeInstanceOf(ConflictException);
  });
});

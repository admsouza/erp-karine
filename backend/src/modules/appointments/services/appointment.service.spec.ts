import { describe, expect, it, vi } from 'vitest';
import { AppointmentService } from './appointment.service.js';

describe('AppointmentService', () => {
  it('cria agendamento com snapshot do procedimento e preço da data', async () => {
    const appointments = { create: vi.fn().mockImplementation((data) => ({ id: 'appt-1', ...data })) };
    const clients = { getById: vi.fn().mockResolvedValue({ id: 'client-1', active: true, fullName: 'Paciente' }) };
    const procedures = {
      getById: vi.fn().mockResolvedValue({ id: 'procedure-1', active: true, name: 'Botox', unit: 'REGIAO' }),
      valueOn: vi.fn().mockResolvedValue(90000),
    };
    const service = new AppointmentService(appointments as never, clients as never, procedures as never);

    const result = await service.create({
      clientId: 'client-1', procedureId: 'procedure-1', scheduledAt: '2026-09-20T14:00:00-03:00', quantity: 2,
    });

    expect(appointments.create).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 'client-1', procedureId: 'procedure-1', procedureName: 'Botox',
      procedureUnit: 'REGIAO', quantity: 2, unitValueCents: 90000, valueCents: 180000,
    }));
    expect(result.valueCents).toBe(180000);
  });

  it('confirma um agendamento ainda agendado', async () => {
    const appointments = {
      findById: vi.fn().mockResolvedValue({ id: 'appt-1', status: 'AGENDADO' }),
      update: vi.fn().mockImplementation((_id, data) => ({ id: 'appt-1', ...data })),
    };
    const service = new AppointmentService(appointments as never, {} as never, {} as never);

    const result = await service.changeStatus('appt-1', 'CONFIRMADO');

    expect(appointments.update).toHaveBeenCalledWith('appt-1', { status: 'CONFIRMADO' });
    expect(result.status).toBe('CONFIRMADO');
  });

  it('publica AppointmentCompleted somente depois de persistir REALIZADO', async () => {
    const completed = { id: 'appt-1', clientId: 'client-1', procedureId: 'procedure-1', procedureName: 'Botox', valueCents: 90000, scheduledAt: new Date(), status: 'REALIZADO' };
    const appointments = { findById: vi.fn().mockResolvedValue({ ...completed, status: 'CONFIRMADO' }), update: vi.fn().mockResolvedValue(completed) };
    const events = { publish: vi.fn().mockResolvedValue(undefined) };
    const service = new AppointmentService(appointments as never, {} as never, {} as never, events as never);
    await service.changeStatus('appt-1', 'REALIZADO');
    expect(events.publish).toHaveBeenCalledWith(expect.objectContaining({ name: 'AppointmentCompleted', appointmentId: 'appt-1', valueCents: 90000 }));
    expect(appointments.update.mock.invocationCallOrder[0]).toBeLessThan(events.publish.mock.invocationCallOrder[0]);
  });
});

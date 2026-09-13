import { http } from '../../../shared/api/http-client';
import type { Appointment, AppointmentInput, AppointmentOption } from '../types/appointment';
import type { AppointmentStatus } from '../types/appointment-status';

export async function listDaily(date: string, signal?: AbortSignal): Promise<Appointment[]> {
  const { data } = await http.get<Appointment[]>('/appointments/agenda/diaria', { params: { date }, signal });
  return data;
}
export async function listWeekly(date: string, signal?: AbortSignal): Promise<Appointment[]> {
  const { data } = await http.get<Appointment[]>('/appointments/agenda/semanal', { params: { date }, signal });
  return data;
}
export async function createAppointment(input: AppointmentInput): Promise<Appointment> {
  const { data } = await http.post<Appointment>('/appointments', input); return data;
}
export async function changeAppointmentStatus(id: string, status: AppointmentStatus): Promise<Appointment> {
  const { data } = await http.patch<Appointment>(`/appointments/${id}/status`, { status }); return data;
}
export async function appointmentOptions(): Promise<{ clients: AppointmentOption[]; procedures: AppointmentOption[] }> {
  const [clients, procedures] = await Promise.all([
    http.get('/clients', { params: { active: 'true', pageSize: 100 } }),
    http.get('/procedures', { params: { active: 'true', pageSize: 100 } }),
  ]);
  return {
    clients: clients.data.items.map((item: { id: string; fullName: string; active: boolean }) => ({ id: item.id, name: item.fullName, active: item.active })),
    procedures: procedures.data.items.map((item: { id: string; name: string; active: boolean; currentValueCents: number | null; unit: AppointmentOption['unit'] }) => ({ id: item.id, name: item.name, active: item.active, currentValueCents: item.currentValueCents, unit: item.unit })),
  };
}

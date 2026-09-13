import type { PaginatedResult } from '../../../shared/types/api';

export interface Client {
  id: string;
  fullName: string;
  cpf: string | null;
  birthDate: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  deactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientInput {
  fullName: string;
  cpf?: string;
  birthDate?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface ClientListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  active?: 'true' | 'false';
}

export type ClientPage = PaginatedResult<Client>;

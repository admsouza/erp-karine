/**
 * Tipos genéricos da API — nada específico de um domínio da clínica.
 * Tipos de domínio ficam em `features/<modulo>/types`.
 */

export interface ApiError {
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  timestamp: string;
}

export interface HealthStatus {
  status: 'ok';
  service: string;
  version: string;
  database: 'up' | 'down';
  uptimeSeconds: number;
  timestamp: string;
}

/** Envelope padrão das listagens paginadas da API. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

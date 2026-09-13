import type { PaginationQueryDto } from './pagination-query.dto.js';

/** Envelope padrão de resposta de listagem. */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function buildPaginatedResult<T>(items: T[], total: number, query: PaginationQueryDto): PaginatedResult<T> {
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: query.pageSize > 0 ? Math.ceil(total / query.pageSize) : 0,
  };
}

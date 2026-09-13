import { Injectable } from '@nestjs/common';
import type { ListAuditEventsQueryDto } from '../dto/list-audit-events.dto.js';
import { AuditEventRepository, type AuditSearchFilters } from '../repositories/audit-event.repository.js';

/** Fuso da clínica: o filtro por data é um dia inteiro em `America/Recife` (UTC-3). */
const fusoDaClinica = '-03:00';

function inicioDoDia(data?: string): Date | undefined {
  return data ? new Date(`${data}T00:00:00${fusoDaClinica}`) : undefined;
}

function fimDoDia(data?: string): Date | undefined {
  return data ? new Date(`${data}T23:59:59.999${fusoDaClinica}`) : undefined;
}

@Injectable()
export class AuditQueryService {
  constructor(private readonly repository: AuditEventRepository) {}

  search(query: ListAuditEventsQueryDto) {
    const filtros: AuditSearchFilters = {
      actorUserId: query.actorUserId,
      module: query.module,
      entityType: query.entityType,
      action: query.action,
      createdAt: query.from || query.to ? { gte: inicioDoDia(query.from), lte: fimDoDia(query.to) } : undefined,
      search: query.search?.trim() || undefined,
      page: query.page,
      pageSize: query.pageSize,
    };
    return this.repository.search(filtros);
  }

  options() {
    return this.repository.options();
  }
}

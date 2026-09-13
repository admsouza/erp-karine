import { Controller, Get, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { ListAuditEventsQueryDto } from '../dto/list-audit-events.dto.js';
import { AuditQueryService } from '../services/audit-query.service.js';

/**
 * Trilha de auditoria do sistema — **somente ADMIN**.
 *
 * A trilha é somente leitura por definição: não existe endpoint de edição nem de
 * exclusão de evento, em nenhum perfil.
 */
@ApiTags('audit')
@ApiCookieAuth('erp_session')
@Roles('ADMIN')
@Controller('audit')
export class AuditController {
  constructor(private readonly query: AuditQueryService) {}

  @Get('events')
  @ApiOperation({ summary: 'Lista a trilha de alterações com filtros (ADMIN)' })
  events(@Query() query: ListAuditEventsQueryDto) {
    return this.query.search(query);
  }

  @Get('filters')
  @ApiOperation({ summary: 'Opções para os filtros da tela de auditoria (ADMIN)' })
  filters() {
    return this.query.options();
  }
}

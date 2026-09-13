import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';

/**
 * Filtros da trilha de auditoria.
 *
 * `PaginationQueryDto` já traz `@Type(() => Number)`: sem isso `?page=1` chegaria
 * como texto e o `@IsInt()` reprovaria (defeito que já apareceu em produção).
 */
export class ListAuditEventsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Autor da alteração' })
  @IsOptional()
  @IsUUID()
  actorUserId?: string;

  @ApiPropertyOptional({ description: 'Módulo dono do registro (ex.: subscriptions)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  module?: string;

  @ApiPropertyOptional({ description: 'Tipo do registro (ex.: SubscriptionPayment)' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  entityType?: string;

  @ApiPropertyOptional({ description: 'Ação registrada (ex.: UPDATED)' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  action?: string;

  @ApiPropertyOptional({ description: 'Data inicial (AAAA-MM-DD, fuso da clínica)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from deve estar no formato AAAA-MM-DD.' })
  from?: string;

  @ApiPropertyOptional({ description: 'Data final (AAAA-MM-DD, fuso da clínica)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to deve estar no formato AAAA-MM-DD.' })
  to?: string;

  @ApiPropertyOptional({ description: 'Busca livre no motivo, nome do autor e id do registro' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

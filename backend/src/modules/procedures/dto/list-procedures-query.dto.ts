import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';

export class ListProceduresQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou descrição' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  /**
   * Filtro de situação. É string de propósito: com conversão implícita ligada no
   * ValidationPipe, `active=false` viraria `true` (Boolean('false') === true).
   */
  @ApiPropertyOptional({ enum: ['true', 'false'], description: 'Filtrar por ativos/inativos' })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: 'true' | 'false';
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';

export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou descrição' })
  @IsOptional() @IsString() @MaxLength(120) search?: string;

  /**
   * Situação como texto de propósito: com a conversão implícita ligada no ValidationPipe,
   * `active=false` viraria `true` (`Boolean('false') === true`).
   */
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional() @IsIn(['true', 'false']) active?: 'true' | 'false';
}

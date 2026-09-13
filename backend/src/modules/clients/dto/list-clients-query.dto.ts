import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';

export type ActiveFilter = 'true' | 'false';

/**
 * Filtro de situação chega como texto ('true'/'false').
 * Não usamos `boolean` aqui de propósito: com `enableImplicitConversion` ativo, o
 * class-transformer converteria a string "false" para `true` (Boolean('false')).
 */
export class ListClientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome, CPF, telefone, WhatsApp ou e-mail' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtra por situação; omitido devolve ativos e inativos',
    enum: ['true', 'false'],
  })
  @IsOptional()
  @IsIn(['true', 'false'], { message: 'active deve ser "true" ou "false".' })
  active?: ActiveFilter;
}

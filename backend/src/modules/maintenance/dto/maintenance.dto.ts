import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';

/** Cadastros que o hub de manutenção cobre (cada um continua no seu módulo dono). */
export const MAINTENANCE_TYPES = [
  'RESOURCE_ACCOUNT',
  'RESOURCE_ACCOUNT_SUGGESTION',
  'CLIENT',
  'PROCEDURE',
  'SUBSCRIPTION_PLAN',
] as const;
export type MaintenanceType = (typeof MAINTENANCE_TYPES)[number];

export class MaintenanceListQueryDto extends PaginationQueryDto {
  @ApiProperty({ enum: MAINTENANCE_TYPES })
  @IsEnum(MAINTENANCE_TYPES)
  type: MaintenanceType;

  @ApiPropertyOptional({ description: 'Busca pela identificação do cadastro' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  /**
   * Situação como **texto** de propósito: com a conversão implícita ligada no
   * ValidationPipe, `active=false` viraria `true` (`Boolean('false') === true`).
   */
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: 'true' | 'false';
}

export class MaintenanceUpdateDto {
  @ApiPropertyOptional({ description: 'Identificação (nome) do cadastro' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ description: 'Tipo do local do recurso (CASH/BANK/CARD)' })
  @IsOptional()
  @IsIn(['CASH', 'BANK', 'CARD'])
  kind?: string;

  @ApiPropertyOptional({ description: 'Telefone do cliente' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({
    description: 'Unidade de medida do procedimento',
    enum: ['SESSAO', 'APLICACAO', 'REGIAO', 'ML', 'UNIDADE', 'HORA', 'PACOTE'],
  })
  @IsOptional()
  @IsIn(['SESSAO', 'APLICACAO', 'REGIAO', 'ML', 'UNIDADE', 'HORA', 'PACOTE'])
  unit?: string;

  @ApiPropertyOptional({ description: 'Valor do plano em centavos' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  priceCents?: number;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { ProcedureUnit } from '../../../generated/prisma/client.js';
import { Transform } from 'class-transformer';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateProcedureDto {
  @ApiProperty({ example: 'Limpeza de pele profunda', maxLength: 120 })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  @MinLength(3, { message: 'Nome deve ter ao menos 3 caracteres.' })
  @MaxLength(120)
  @Transform(trim)
  name: string;

  @ApiPropertyOptional({ example: 'Higienização, extração e máscara calmante.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Transform(trim)
  description?: string;

  @ApiPropertyOptional({
    enum: ProcedureUnit,
    example: ProcedureUnit.SESSAO,
    description: 'Unidade de medida pela qual o valor unitário é cobrado. Padrão: SESSAO.',
  })
  @IsOptional()
  @IsEnum(ProcedureUnit, { message: 'Unidade de medida inválida.' })
  unit?: ProcedureUnit;

  @ApiPropertyOptional({ example: 60, description: 'Duração aproximada em minutos' })
  @IsOptional()
  @IsInt({ message: 'Duração deve ser um número inteiro de minutos.' })
  @Min(5, { message: 'Duração mínima de 5 minutos.' })
  @Max(600, { message: 'Duração máxima de 600 minutos.' })
  durationMinutes?: number;

  @ApiPropertyOptional({
    example: 18000,
    description: 'Valor unitário inicial em centavos (R$ 180,00). Vira a primeira vigência.',
  })
  @IsOptional()
  @IsInt({ message: 'Informe o valor em centavos (número inteiro).' })
  @Min(0)
  @Max(100_000_000)
  initialValueCents?: number;
}

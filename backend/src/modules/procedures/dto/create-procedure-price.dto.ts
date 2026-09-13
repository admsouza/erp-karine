import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProcedurePriceDto {
  @ApiProperty({ example: 18000, description: 'Valor unitário em centavos (R$ 180,00)' })
  @IsInt({ message: 'Informe o valor em centavos (número inteiro).' })
  @Min(0, { message: 'Valor não pode ser negativo.' })
  @Max(100_000_000, { message: 'Valor acima do limite permitido.' })
  valueCents: number;

  @ApiPropertyOptional({
    example: '2026-10-01',
    description: 'Início da vigência (AAAA-MM-DD). Padrão: hoje.',
  })
  @IsOptional()
  @IsISO8601({}, { message: 'Data de vigência deve estar no formato AAAA-MM-DD.' })
  validFrom?: string;

  @ApiPropertyOptional({ example: 'Reajuste anual', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  note?: string;
}

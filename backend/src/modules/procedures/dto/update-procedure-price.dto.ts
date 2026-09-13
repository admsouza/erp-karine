import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * Correção da vigência **atual** (valor e observação).
 *
 * Vigência já encerrada não é editável: o histórico é a base de conferência do
 * que foi cobrado, então valor passado se corrige com uma vigência nova.
 */
export class UpdateProcedurePriceDto {
  @ApiPropertyOptional({ example: 18000, description: 'Novo valor unitário em centavos' })
  @IsOptional()
  @IsInt({ message: 'Informe o valor em centavos (número inteiro).' })
  @Min(0, { message: 'Valor não pode ser negativo.' })
  @Max(100_000_000, { message: 'Valor acima do limite permitido.' })
  valueCents?: number;

  @ApiPropertyOptional({ example: 'Valor corrigido no cadastro', maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  note?: string;
}

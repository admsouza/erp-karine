import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateProductDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120) name: string;

  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(500) description?: string;

  @ApiPropertyOptional({ description: 'Unidade (ex.: unidade, caixa, ml)' })
  @Transform(trim) @IsOptional() @IsString() @MaxLength(30) unit?: string;

  @ApiPropertyOptional({ description: 'Valor em centavos' })
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000) priceCents?: number;
}

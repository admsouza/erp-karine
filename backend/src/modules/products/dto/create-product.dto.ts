import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ProductCommercialUse } from '../../../generated/prisma/client.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateProductDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional({ description: 'Unidade (ex.: unidade, caixa, ml)' }) @Transform(trim) @IsOptional() @IsString() @MaxLength(30) unit?: string;
  @ApiPropertyOptional({ description: 'Preço de venda sugerido em centavos' }) @IsOptional() @IsInt() @Min(0) @Max(100_000_000) priceCents?: number;
  @ApiPropertyOptional({ description: 'Custo de compra sugerido em centavos' }) @IsOptional() @IsInt() @Min(0) @Max(100_000_000) purchasePriceCents?: number;
  @ApiProperty({ enum: ProductCommercialUse, default: ProductCommercialUse.VENDA }) @IsOptional() @IsEnum(ProductCommercialUse) commercialUse?: ProductCommercialUse;
}

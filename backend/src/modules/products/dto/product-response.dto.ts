import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductCommercialUse } from '../../../generated/prisma/client.js';
import type { ProductEntity } from '../entities/product.entity.js';

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() unit: string | null;
  @ApiProperty({ description: 'Preço de venda sugerido, em centavos' }) priceCents: number;
  @ApiProperty({ description: 'Custo de compra sugerido, em centavos' }) purchasePriceCents: number;
  @ApiProperty() commercialUse: ProductCommercialUse;
  @ApiProperty() active: boolean;
  @ApiPropertyOptional() deactivatedAt: Date | null;
  @ApiProperty() updatedAt: Date;
  static from(entity: ProductEntity): ProductResponseDto {
    return { id: entity.id, name: entity.name, description: entity.description, unit: entity.unit, priceCents: entity.priceCents, purchasePriceCents: entity.purchasePriceCents, commercialUse: entity.commercialUse, active: entity.active, deactivatedAt: entity.deactivatedAt, updatedAt: entity.updatedAt };
  }
}

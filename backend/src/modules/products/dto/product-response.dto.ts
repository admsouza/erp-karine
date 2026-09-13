import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProductEntity } from '../entities/product.entity.js';

export class ProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiPropertyOptional() description: string | null;
  @ApiPropertyOptional() unit: string | null;
  @ApiProperty() priceCents: number;
  @ApiProperty() active: boolean;
  @ApiPropertyOptional() deactivatedAt: Date | null;
  @ApiProperty() updatedAt: Date;

  static from(entity: ProductEntity): ProductResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      unit: entity.unit,
      priceCents: entity.priceCents,
      active: entity.active,
      deactivatedAt: entity.deactivatedAt,
      updatedAt: entity.updatedAt,
    };
  }
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProcedurePriceEntity } from '../entities/procedure-price.entity.js';

export class ProcedurePriceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: 'Valor unitário em centavos' })
  valueCents: number;

  @ApiProperty({ description: 'Início da vigência (inclusive)' })
  validFrom: Date;

  @ApiPropertyOptional({ nullable: true, description: 'Fim da vigência (exclusivo); null = vigência atual' })
  validTo: Date | null;

  @ApiPropertyOptional({ nullable: true })
  note: string | null;

  @ApiProperty()
  createdAt: Date;

  static from(entity: ProcedurePriceEntity): ProcedurePriceResponseDto {
    return Object.assign(new ProcedurePriceResponseDto(), entity);
  }
}

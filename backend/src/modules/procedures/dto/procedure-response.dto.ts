import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ProcedureEntity } from '../entities/procedure.entity.js';

export class ProcedureResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Valor padrão em centavos' })
  defaultValueCents: number;

  @ApiPropertyOptional({ nullable: true, description: 'Duração aproximada em minutos' })
  durationMinutes: number | null;

  @ApiProperty()
  active: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(entity: ProcedureEntity): ProcedureResponseDto {
    return Object.assign(new ProcedureResponseDto(), entity);
  }
}

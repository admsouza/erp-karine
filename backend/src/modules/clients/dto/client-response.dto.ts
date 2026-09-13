import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ClientEntity } from '../entities/client.entity.js';

/** Contrato de saída do cliente (o que a API expõe). */
export class ClientResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Maria da Silva' })
  fullName: string;

  @ApiPropertyOptional({ example: '52998224725', nullable: true })
  cpf: string | null;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true })
  birthDate: Date | null;

  @ApiPropertyOptional({ nullable: true })
  phone: string | null;

  @ApiPropertyOptional({ nullable: true })
  whatsapp: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiProperty({ description: 'Cliente ativo (inativação substitui exclusão)' })
  active: boolean;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  deactivatedAt: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt: Date;

  static from(entity: ClientEntity): ClientResponseDto {
    return Object.assign(new ClientResponseDto(), entity);
  }
}

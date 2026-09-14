import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { DiscountType, FinancialStatus, FinancialTransactionType, PaymentMethod, TransactionOrigin } from '../../../generated/prisma/client.js';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CreateManualTransactionDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() resourceAccountId?: string;
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) description: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(80) category?: string;
  @ApiProperty() @IsInt() @Min(1) @Max(100_000_000) amountCents: number;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @ApiProperty({ enum: FinancialTransactionType }) @IsEnum(FinancialTransactionType) type: FinancialTransactionType;
  @ApiProperty({ enum: FinancialStatus }) @IsEnum(FinancialStatus) status: FinancialStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional({ description: 'Credor da despesa (quem recebeu)' }) @Transform(trim) @IsOptional() @IsString() @MaxLength(120) counterparty?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() procedureId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional({ description: 'Valor cheio antes do desconto (centavos)' }) @IsOptional() @IsInt() @Min(1) @Max(100_000_000) grossAmountCents?: number;
  @ApiPropertyOptional({ enum: DiscountType }) @IsOptional() @IsEnum(DiscountType) discountType?: DiscountType;
  @ApiPropertyOptional({ description: 'Percentual em pontos-base (10% = 1000) ou centavos' }) @IsOptional() @IsInt() @Min(0) @Max(100_000_000) discountValue?: number;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(120) externalReference?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class UpdateFinancialTransactionDto extends CreateManualTransactionDto {
  @ApiProperty({ description: 'Motivo obrigatório da alteração' }) @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}
export class DeleteFinancialTransactionDto {
  @ApiProperty({ description: 'Motivo obrigatório da exclusão lógica' }) @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}
export class ListFinancialTransactionsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional({ description: 'Credor da despesa (quem recebeu)' }) @Transform(trim) @IsOptional() @IsString() @MaxLength(120) counterparty?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() procedureId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional({ description: 'Valor cheio antes do desconto (centavos)' }) @IsOptional() @IsInt() @Min(1) @Max(100_000_000) grossAmountCents?: number;
  @ApiPropertyOptional({ enum: DiscountType }) @IsOptional() @IsEnum(DiscountType) discountType?: DiscountType;
  @ApiPropertyOptional({ description: 'Percentual em pontos-base (10% = 1000) ou centavos' }) @IsOptional() @IsInt() @Min(0) @Max(100_000_000) discountValue?: number;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ enum: TransactionOrigin }) @IsOptional() @IsEnum(TransactionOrigin) origin?: TransactionOrigin;
  @ApiPropertyOptional({ enum: FinancialTransactionType }) @IsOptional() @IsEnum(FinancialTransactionType) type?: FinancialTransactionType;
  @ApiPropertyOptional({ enum: FinancialStatus }) @IsOptional() @IsEnum(FinancialStatus) status?: FinancialStatus;
}

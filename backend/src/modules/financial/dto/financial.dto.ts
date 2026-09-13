import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { FinancialStatus, FinancialTransactionType, PaymentMethod, TransactionOrigin } from '../../../generated/prisma/client.js';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CreateManualTransactionDto {
  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) description: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(80) category?: string;
  @ApiProperty() @IsInt() @Min(1) @Max(100_000_000) amountCents: number;
  @ApiProperty() @IsDateString() date: string;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @ApiProperty({ enum: FinancialTransactionType }) @IsEnum(FinancialTransactionType) type: FinancialTransactionType;
  @ApiProperty({ enum: FinancialStatus }) @IsEnum(FinancialStatus) status: FinancialStatus;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(120) externalReference?: string;
  @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class ListFinancialTransactionsQueryDto {
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() to?: string;
  @ApiPropertyOptional({ enum: TransactionOrigin }) @IsOptional() @IsEnum(TransactionOrigin) origin?: TransactionOrigin;
  @ApiPropertyOptional({ enum: FinancialTransactionType }) @IsOptional() @IsEnum(FinancialTransactionType) type?: FinancialTransactionType;
  @ApiPropertyOptional({ enum: FinancialStatus }) @IsOptional() @IsEnum(FinancialStatus) status?: FinancialStatus;
}

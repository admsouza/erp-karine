import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  FinancialTransactionType,
  PaymentMethod,
} from '../../../generated/prisma/client.js';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';
export class CreateFinancialTitleDto {
  @IsEnum(FinancialTransactionType) type: FinancialTransactionType;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  description: string;
  @IsOptional() @IsString() @MaxLength(160) counterparty?: string;
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  @IsDateString({ strict: true })
  dueDate: string;
  @IsInt() @Min(1) @Max(100_000_000) amountCents: number;
}
export class SettleFinancialTitleDto {
  @IsInt() @Min(1) @Max(100_000_000) amountCents: number;
  @IsDateString({ strict: true }) date: string;
  @IsUUID() resourceAccountId: string;
  @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @IsUUID() idempotencyKey: string;
}
export class ListFinancialTitlesDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(FinancialTransactionType)
  type?: FinancialTransactionType;
}

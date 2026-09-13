import { IsEnum, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { FinancialTransactionType } from '../../../generated/prisma/client.js';
import { SettleFinancialTitleDto } from './financial-title.dto.js';
export class CreateAdjustmentDto extends SettleFinancialTitleDto {
  @IsEnum(FinancialTransactionType) type: FinancialTransactionType;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  description: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

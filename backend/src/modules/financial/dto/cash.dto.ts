import { Type, Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
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
  ValidateNested,
} from 'class-validator';
import { ResourceAccountKind } from '../../../generated/prisma/client.js';
export class CreateResourceAccountDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsEnum(ResourceAccountKind) kind: ResourceAccountKind;
}
export class UpdateResourceAccountDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsEnum(ResourceAccountKind)
  kind?: ResourceAccountKind;
}
export class CreateAccountSuggestionDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;
  @IsEnum(ResourceAccountKind) kind: ResourceAccountKind;
}
export class UpdateAccountSuggestionDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;
  @IsOptional()
  @IsEnum(ResourceAccountKind) kind?: ResourceAccountKind;
}
export class CountBalanceDto {
  @IsUUID() accountId: string;
  @IsInt() @Min(-2_000_000_000) @Max(2_000_000_000) amountCents: number;
}
export class OpenCashPeriodDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/) month: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CountBalanceDto)
  initialBalances?: CountBalanceDto[];
}
export class FinancialReasonDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}
export class CloseCashPeriodDto extends FinancialReasonDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => CountBalanceDto)
  balances: CountBalanceDto[];
}
export class AssignResourceDto extends FinancialReasonDto {
  @IsUUID() resourceAccountId: string;
}
export class CreateReconciliationDto extends CountBalanceDto {
  @IsUUID() periodId: string;
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;
}

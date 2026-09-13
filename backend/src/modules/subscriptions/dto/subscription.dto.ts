import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';
import { PaymentMethod, Periodicity, SubscriptionStatus } from '../../../generated/prisma/client.js';
const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
export class CreatePlanDto {
 @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(120) name: string;
 @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(1000) description?: string;
 @ApiProperty() @IsInt() @Min(0) @Max(100_000_000) priceCents: number;
 @ApiProperty({ enum: Periodicity }) @IsEnum(Periodicity) periodicity: Periodicity;
 @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(1000) sessionsPerPeriod?: number;
}
export class UpdatePlanDto extends PartialType(CreatePlanDto) {}
export class ListPlansQueryDto { @ApiPropertyOptional() @IsOptional() @IsString() search?: string; @ApiPropertyOptional({ enum: ['true','false'] }) @IsOptional() @IsIn(['true','false']) active?: 'true'|'false'; }
export class CreateSubscriptionDto {
 @ApiProperty({ format:'uuid' }) @IsUUID() clientId: string;
 @ApiProperty({ format:'uuid' }) @IsUUID() planId: string;
 @ApiProperty() @IsDateString() startDate: string;
 @ApiPropertyOptional() @IsOptional() @IsDateString() endDate?: string;
 @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
 @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class ListSubscriptionsQueryDto { @ApiPropertyOptional({ format:'uuid' }) @IsOptional() @IsUUID() clientId?: string; @ApiPropertyOptional({ enum: SubscriptionStatus }) @IsOptional() @IsEnum(SubscriptionStatus) status?: SubscriptionStatus; }
export class ChangeSubscriptionStatusDto { @ApiProperty({ enum: SubscriptionStatus }) @IsEnum(SubscriptionStatus) status: SubscriptionStatus; }
export class CreatePaymentDto {
 @ApiProperty() @IsInt() @Min(1) @Max(100_000_000) amountCents: number;
 @ApiProperty() @IsDateString() paidAt: string;
 @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
 @ApiPropertyOptional() @Transform(trim) @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
export class UpdatePaymentDto extends CreatePaymentDto {
 @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MinLength(3) @MaxLength(500) reason: string;
}
export class PaymentTimelineQueryDto {
 @ApiPropertyOptional({ default: 1 }) @IsOptional() @IsInt() @Min(1) page = 1;
 @ApiPropertyOptional({ default: 20 }) @IsOptional() @IsInt() @Min(1) @Max(100) pageSize = 20;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() clientId: string;
  @ApiProperty({ format: 'uuid' }) @IsUUID() procedureId: string;
  @ApiProperty({ example: '2026-09-20T14:00:00-03:00' }) @IsDateString() scheduledAt: string;
  @ApiPropertyOptional({ example: 1, default: 1 }) @IsOptional() @IsInt() @Min(1) @Max(10000) quantity?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) professional?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

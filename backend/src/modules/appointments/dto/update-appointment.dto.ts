import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAppointmentDto {
  @ApiPropertyOptional({ example: '2026-09-20T15:00:00-03:00' })
  @IsOptional() @IsDateString() scheduledAt?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(120) professional?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}

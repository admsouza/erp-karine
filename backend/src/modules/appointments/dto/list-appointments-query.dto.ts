import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { AppointmentStatus } from '../../../generated/prisma/client.js';

export class ListAppointmentsQueryDto {
  @ApiPropertyOptional({ example: '2026-09-20T00:00:00-03:00' })
  @IsOptional() @IsDateString() from?: string;

  @ApiPropertyOptional({ example: '2026-09-27T00:00:00-03:00' })
  @IsOptional() @IsDateString() to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID() clientId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus })
  @IsOptional() @IsEnum(AppointmentStatus) status?: AppointmentStatus;
}

export class AgendaDateQueryDto {
  @ApiPropertyOptional({ example: '2026-09-20' })
  @IsDateString() date: string;
}

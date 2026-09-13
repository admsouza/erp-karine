import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
export class CreateProtocolDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() clientId!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() procedureId?: string;
  @ApiProperty({ example: '2026-09-13' }) @IsDateString() date!: string;
  @ApiProperty() @IsString() @Length(3, 120) title!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) chiefComplaint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) evaluation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) objective?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) proposedProtocol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) guidelines?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
export class CreateProtocolSessionDto {
  @ApiProperty() @IsDateString() date!: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() procedureId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() appointmentId?: string;
  @ApiProperty() @IsString() @MinLength(3) @MaxLength(500) procedurePerformed!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500) professional?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) productsUsed?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) parameters?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) evolution?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) guidelines?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}

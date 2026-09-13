import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID, Length, MaxLength } from 'class-validator';
export class UpdateProtocolDto {
  @ApiPropertyOptional({ format: 'uuid', nullable: true }) @IsOptional() @IsUUID() procedureId?: string;
  @ApiPropertyOptional() @IsOptional() @IsDateString() date?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @Length(3, 120) title?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) chiefComplaint?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) evaluation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2000) objective?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) proposedProtocol?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) guidelines?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(4000) notes?: string;
}

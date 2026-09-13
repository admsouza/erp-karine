import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';
export type ProtocolStatusFilter = 'EM_ANDAMENTO' | 'CONCLUIDO' | 'CANCELADO';
export class ListProtocolsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional({ format: 'uuid' }) @IsOptional() @IsUUID() clientId?: string;
  @ApiPropertyOptional({ enum: ['EM_ANDAMENTO','CONCLUIDO','CANCELADO'] }) @IsOptional() @IsIn(['EM_ANDAMENTO','CONCLUIDO','CANCELADO']) status?: ProtocolStatusFilter;
  @ApiPropertyOptional({ enum: ['true','false'] }) @IsOptional() @IsIn(['true','false']) active?: 'true'|'false';
}
export class ChangeProtocolStatusDto { @ApiPropertyOptional({ enum: ['EM_ANDAMENTO','CONCLUIDO','CANCELADO'] }) @IsIn(['EM_ANDAMENTO','CONCLUIDO','CANCELADO']) status!: ProtocolStatusFilter; }

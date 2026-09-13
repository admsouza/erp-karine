import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProcedureService } from '../services/procedure.service.js';
import { ProcedureQueryService } from '../services/procedure-query.service.js';
import { CreateProcedureDto } from '../dto/create-procedure.dto.js';
import { UpdateProcedureDto } from '../dto/update-procedure.dto.js';
import { ListProceduresQueryDto } from '../dto/list-procedures-query.dto.js';
import { ProcedureResponseDto } from '../dto/procedure-response.dto.js';
import type { PaginatedResult } from '../../../common/pagination/paginated.js';

@ApiTags('procedures')
@Controller('procedures')
export class ProceduresController {
  constructor(
    private readonly service: ProcedureService,
    private readonly queries: ProcedureQueryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um procedimento no catálogo' })
  async create(@Body() dto: CreateProcedureDto): Promise<ProcedureResponseDto> {
    return ProcedureResponseDto.from(await this.service.create(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Lista procedimentos (busca e situação, paginado)' })
  async list(
    @Query() query: ListProceduresQueryDto,
  ): Promise<PaginatedResult<ProcedureResponseDto>> {
    const pagina = await this.queries.list(query);
    return { ...pagina, items: pagina.items.map(ProcedureResponseDto.from) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um procedimento' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProcedureResponseDto> {
    return ProcedureResponseDto.from(await this.queries.getById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita um procedimento' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcedureDto,
  ): Promise<ProcedureResponseDto> {
    return ProcedureResponseDto.from(await this.service.update(id, dto));
  }

  @Patch(':id/inactivate')
  @ApiOperation({ summary: 'Inativa (sem excluir) um procedimento' })
  async inactivate(@Param('id', ParseUUIDPipe) id: string): Promise<ProcedureResponseDto> {
    return ProcedureResponseDto.from(await this.service.inactivate(id));
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reativa um procedimento' })
  async reactivate(@Param('id', ParseUUIDPipe) id: string): Promise<ProcedureResponseDto> {
    return ProcedureResponseDto.from(await this.service.reactivate(id));
  }
}

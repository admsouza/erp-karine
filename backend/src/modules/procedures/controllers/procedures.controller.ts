import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProcedureService } from '../services/procedure.service.js';
import { ProcedureQueryService } from '../services/procedure-query.service.js';
import { ProcedurePriceService } from '../services/procedure-price.service.js';
import { CreateProcedureDto } from '../dto/create-procedure.dto.js';
import { UpdateProcedureDto } from '../dto/update-procedure.dto.js';
import { ListProceduresQueryDto } from '../dto/list-procedures-query.dto.js';
import { ProcedureResponseDto } from '../dto/procedure-response.dto.js';
import { CreateProcedurePriceDto } from '../dto/create-procedure-price.dto.js';
import { UpdateProcedurePriceDto } from '../dto/update-procedure-price.dto.js';
import { ProcedurePriceResponseDto } from '../dto/procedure-price-response.dto.js';
import type { PaginatedResult } from '../../../common/pagination/paginated.js';

@ApiTags('procedures')
@Controller('procedures')
export class ProceduresController {
  constructor(
    private readonly service: ProcedureService,
    private readonly queries: ProcedureQueryService,
    private readonly prices: ProcedurePriceService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um procedimento no catálogo' })
  async create(@Body() dto: CreateProcedureDto): Promise<ProcedureResponseDto> {
    return ProcedureResponseDto.from(await this.service.create(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Lista procedimentos (busca e situação, paginado)' })
  async list(@Query() query: ListProceduresQueryDto): Promise<PaginatedResult<ProcedureResponseDto>> {
    const pagina = await this.queries.list(query);
    return { ...pagina, items: pagina.items.map(ProcedureResponseDto.from) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um procedimento' })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProcedureResponseDto> {
    return ProcedureResponseDto.from(await this.queries.getById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita nome, descrição ou duração (valor muda por vigência)' })
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

  // ---------------------------------------------------------------- vigências

  @Get(':id/prices')
  @ApiOperation({ summary: 'Histórico de valores (vigências) do procedimento' })
  async listPrices(@Param('id', ParseUUIDPipe) id: string): Promise<ProcedurePriceResponseDto[]> {
    const vigencias = await this.prices.list(id);
    return vigencias.map(ProcedurePriceResponseDto.from);
  }

  @Get(':id/price-on')
  @ApiOperation({ summary: 'Valor unitário que valia em uma data (para conferência)' })
  async priceOn(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') date?: string,
  ): Promise<{ valueCents: number | null }> {
    return { valueCents: await this.queries.valueOn(id, date) };
  }

  @Post(':id/prices')
  @ApiOperation({ summary: 'Novo valor: cria vigência e fecha a anterior' })
  async addPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateProcedurePriceDto,
  ): Promise<ProcedurePriceResponseDto> {
    return ProcedurePriceResponseDto.from(await this.prices.add(id, dto));
  }

  @Patch(':id/prices/:priceId')
  @ApiOperation({ summary: 'Corrige o valor/observação da vigência atual (encerrada não é editável)' })
  async updatePrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('priceId', ParseUUIDPipe) priceId: string,
    @Body() dto: UpdateProcedurePriceDto,
  ): Promise<ProcedurePriceResponseDto> {
    return ProcedurePriceResponseDto.from(await this.prices.update(id, priceId, dto));
  }

  @Delete(':id/prices/:priceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove uma vigência (correção); a anterior volta a valer' })
  async removePrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('priceId', ParseUUIDPipe) priceId: string,
  ): Promise<void> {
    await this.prices.remove(id, priceId);
  }
}

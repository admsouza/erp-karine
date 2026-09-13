import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PaginatedResult } from '../../../common/pagination/paginated.js';
import { ClientResponseDto } from '../dto/client-response.dto.js';
import { CreateClientDto } from '../dto/create-client.dto.js';
import { ListClientsQueryDto } from '../dto/list-clients-query.dto.js';
import { UpdateClientDto } from '../dto/update-client.dto.js';
import { ClientQueryService } from '../services/client-query.service.js';
import { ClientService } from '../services/client.service.js';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(
    private readonly service: ClientService,
    private readonly queries: ClientQueryService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Cadastra um cliente' })
  @ApiCreatedResponse({ type: ClientResponseDto })
  async create(@Body() dto: CreateClientDto): Promise<ClientResponseDto> {
    return ClientResponseDto.from(await this.service.create(dto));
  }

  @Get()
  @ApiOperation({ summary: 'Lista clientes com busca por nome, CPF, telefone, WhatsApp e e-mail' })
  @ApiOkResponse({ description: 'Lista paginada de clientes' })
  async list(@Query() query: ListClientsQueryDto): Promise<PaginatedResult<ClientResponseDto>> {
    const page = await this.queries.list(query);
    return { ...page, items: page.items.map(ClientResponseDto.from) };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um cliente' })
  @ApiOkResponse({ type: ClientResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    return ClientResponseDto.from(await this.queries.getById(id));
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita um cliente' })
  @ApiOkResponse({ type: ClientResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClientDto,
  ): Promise<ClientResponseDto> {
    return ClientResponseDto.from(await this.service.update(id, dto));
  }

  @Patch(':id/inactivate')
  @ApiOperation({ summary: 'Inativa o cliente (sem exclusão física)' })
  @ApiOkResponse({ type: ClientResponseDto })
  async inactivate(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    return ClientResponseDto.from(await this.service.inactivate(id));
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reativa o cliente' })
  @ApiOkResponse({ type: ClientResponseDto })
  async reactivate(@Param('id', ParseUUIDPipe) id: string): Promise<ClientResponseDto> {
    return ClientResponseDto.from(await this.service.reactivate(id));
  }
}

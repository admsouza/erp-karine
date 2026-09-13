import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { CreateProductDto } from '../dto/create-product.dto.js';
import { ListProductsQueryDto } from '../dto/list-products-query.dto.js';
import { ProductResponseDto } from '../dto/product-response.dto.js';
import { UpdateProductDto } from '../dto/update-product.dto.js';
import { ProductQueryService } from '../services/product-query.service.js';
import { ProductService } from '../services/product.service.js';

@ApiTags('products')
@Controller('products')
export class ProductsController {
  constructor(
    private readonly service: ProductService,
    private readonly query: ProductQueryService,
  ) {}

  @Get()
  async list(@Query() filters: ListProductsQueryDto) {
    const pagina = await this.query.list({
      search: filters.search,
      active: filters.active === undefined ? undefined : filters.active === 'true',
      page: filters.page,
      pageSize: filters.pageSize,
    });
    return { ...pagina, items: pagina.items.map(ProductResponseDto.from) };
  }

  @Get('options')
  async options() {
    return (await this.query.listActive()).map(ProductResponseDto.from);
  }

  @Get(':id')
  async get(@Param('id', ParseUUIDPipe) id: string) {
    return ProductResponseDto.from(await this.query.getById(id));
  }

  @Post()
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return ProductResponseDto.from(
      await this.service.create(dto, user, requestId || randomUUID()),
    );
  }

  @Patch(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return ProductResponseDto.from(
      await this.service.update(id, dto, user, requestId || randomUUID()),
    );
  }

  @Patch(':id/inactivate')
  async inactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return ProductResponseDto.from(
      await this.service.inactivate(id, user, requestId || randomUUID()),
    );
  }

  @Patch(':id/reactivate')
  async reactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return ProductResponseDto.from(
      await this.service.reactivate(id, user, requestId || randomUUID()),
    );
  }
}

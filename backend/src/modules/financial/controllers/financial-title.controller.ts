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
import { FinancialReasonDto } from '../dto/cash.dto.js';
import {
  CreateFinancialTitleDto,
  ListFinancialTitlesDto,
  SettleFinancialTitleDto,
} from '../dto/financial-title.dto.js';
import { FinancialTitleService } from '../services/financial-title.service.js';
@ApiTags('financial')
@Controller('financial/titles')
export class FinancialTitleController {
  constructor(private readonly service: FinancialTitleService) {}
  @Get() list(@Query() q: ListFinancialTitlesDto) {
    return this.service.list(q);
  }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(id);
  }
  @Post() create(
    @Body() dto: CreateFinancialTitleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.create(dto, user, requestId || randomUUID());
  }
  @Post(':id/settlements') settle(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SettleFinancialTitleDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.settle(id, dto, user, requestId || randomUUID());
  }
  @Patch(':id/cancel') cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinancialReasonDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.cancel(id, dto.reason, user, requestId || randomUUID());
  }
}

import { FinancialAdjustmentService } from '../services/financial-adjustment.service.js';
import { CreateAdjustmentDto } from '../dto/adjustment.dto.js';
import { randomUUID } from 'node:crypto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { AssignResourceDto } from '../dto/cash.dto.js';
import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateManualTransactionDto, ListFinancialTransactionsQueryDto } from '../dto/financial.dto.js';
import { FinancialQueryService } from '../services/financial-query.service.js';
import { FinancialTransactionService } from '../services/financial-transaction.service.js';
function dates(query: ListFinancialTransactionsQueryDto) { return { from: query.from ? new Date(`${query.from}T00:00:00-03:00`) : undefined, to: query.to ? new Date(`${query.to}T00:00:00-03:00`) : undefined, clientId: query.clientId }; }
@ApiTags('financial')
@Controller('financial')
export class FinancialController {
  constructor(private readonly adjustments:FinancialAdjustmentService,private readonly transactions: FinancialTransactionService, private readonly query: FinancialQueryService) {}
  @Post('transactions') create(@Body() dto: CreateManualTransactionDto,@CurrentUser() user:AuthenticatedUser,@Headers('x-request-id') requestId?:string) { return this.transactions.createManual(dto,user,requestId||randomUUID()); }
  @Get('transactions') list(@Query() q: ListFinancialTransactionsQueryDto) { return this.query.list({ ...dates(q), origin: q.origin, type: q.type, status: q.status }); }
  @Patch('transactions/:id/cancel') cancel(@Param('id', ParseUUIDPipe) id: string,@CurrentUser() user:AuthenticatedUser,@Headers('x-request-id') requestId?:string) { return this.transactions.cancel(id,user,requestId||randomUUID()); }
  @Patch('transactions/:id/resource') assign(@Param('id',ParseUUIDPipe) id:string,@Body() dto:AssignResourceDto,@CurrentUser() user:AuthenticatedUser,@Headers('x-request-id') requestId?:string){return this.transactions.assign(id,dto,user,requestId||randomUUID());}
  @Post('transactions/:id/adjustments') adjustment(@Param('id',ParseUUIDPipe) id:string,@Body() dto:CreateAdjustmentDto,@CurrentUser() user:AuthenticatedUser,@Headers('x-request-id') requestId?:string){return this.adjustments.create(id,dto,user,requestId||randomUUID());}
  @Get('transactions/counterparties') counterparties() { return this.query.listCounterparties(); }
  @Get('summary') summary(@Query() q: ListFinancialTransactionsQueryDto) { return this.query.summary(dates(q)); }
  @Get('reports') reports(@Query() q: ListFinancialTransactionsQueryDto) { return this.query.reports(dates(q)); }
}

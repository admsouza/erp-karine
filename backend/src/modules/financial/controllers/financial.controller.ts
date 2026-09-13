import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateManualTransactionDto, ListFinancialTransactionsQueryDto } from '../dto/financial.dto.js';
import { FinancialQueryService } from '../services/financial-query.service.js';
import { FinancialTransactionService } from '../services/financial-transaction.service.js';
function dates(query: ListFinancialTransactionsQueryDto) { return { from: query.from ? new Date(`${query.from}T00:00:00-03:00`) : undefined, to: query.to ? new Date(`${query.to}T00:00:00-03:00`) : undefined, clientId: query.clientId }; }
@ApiTags('financial')
@Controller('financial')
export class FinancialController {
  constructor(private readonly transactions: FinancialTransactionService, private readonly query: FinancialQueryService) {}
  @Post('transactions') create(@Body() dto: CreateManualTransactionDto) { return this.transactions.createManual(dto); }
  @Get('transactions') list(@Query() q: ListFinancialTransactionsQueryDto) { return this.query.list({ ...dates(q), origin: q.origin, type: q.type, status: q.status }); }
  @Patch('transactions/:id/cancel') cancel(@Param('id', ParseUUIDPipe) id: string) { return this.transactions.cancel(id); }
  @Get('summary') summary(@Query() q: ListFinancialTransactionsQueryDto) { return this.query.summary(dates(q)); }
  @Get('reports') reports(@Query() q: ListFinancialTransactionsQueryDto) { return this.query.reports(dates(q)); }
}

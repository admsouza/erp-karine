import { ReconciliationService } from '../services/reconciliation.service.js';
import { CashClosingService } from '../services/cash-closing.service.js';
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
import {
  CreateAccountSuggestionDto,
  CreateReconciliationDto,
  CloseCashPeriodDto,
  CreateResourceAccountDto,
  OpenCashPeriodDto,
  UpdateAccountSuggestionDto,
  UpdateResourceAccountDto,
} from '../dto/cash.dto.js';
import { ResourceAccountSuggestionService } from '../services/resource-account-suggestion.service.js';
import { CashPeriodService } from '../services/cash-period.service.js';
import { ResourceAccountService } from '../services/resource-account.service.js';
@ApiTags('financial')
@Controller('financial')
export class CashController {
  constructor(
    private readonly suggestions: ResourceAccountSuggestionService,
    private readonly reconciliation: ReconciliationService,
    private readonly closing: CashClosingService,
    private readonly periods: CashPeriodService,
    private readonly accounts: ResourceAccountService,
  ) {}
  @Post('cash-periods/:id/close') close(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CloseCashPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.closing.close(id, dto, user, requestId || randomUUID());
  }
  @Post('reconciliations') reconcile(
    @Body() dto: CreateReconciliationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.reconciliation.create(dto, user, requestId || randomUUID());
  }
  @Get('cash-periods/:id/reconciliations') reconciliations(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reconciliation.list(id);
  }
  @Get('accounts') listAccounts() {
    return this.accounts.list();
  }
  @Post('accounts') createAccount(
    @Body() dto: CreateResourceAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.accounts.create(dto, user, requestId || randomUUID());
  }
  @Patch('accounts/:id') updateAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceAccountDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.accounts.update(id, dto, user, requestId || randomUUID());
  }
  @Patch('accounts/:id/inactivate') inactivateAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.accounts.inactivate(id, user, requestId || randomUUID());
  }
  @Patch('accounts/:id/reactivate') reactivateAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.accounts.reactivate(id, user, requestId || randomUUID());
  }
  @Get('account-suggestions') listSuggestions(@Query('active') active?: string) {
    return this.suggestions.list(active === 'true');
  }
  @Post('account-suggestions') createSuggestion(
    @Body() dto: CreateAccountSuggestionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.suggestions.create(dto, user, requestId || randomUUID());
  }
  @Patch('account-suggestions/:id') updateSuggestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAccountSuggestionDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.suggestions.update(id, dto, user, requestId || randomUUID());
  }
  @Patch('account-suggestions/:id/inactivate') inactivateSuggestion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.suggestions.inactivate(id, user, requestId || randomUUID());
  }
  @Patch('account-suggestions/:id/reactivate') reactivateSuggestion(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.suggestions.reactivate(id, user, requestId || randomUUID());
  }
  @Get('cash-periods') list() {
    return this.periods.list();
  }
  @Get('cash-periods/:id') detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.periods.detail(id);
  }
  @Post('cash-periods') open(
    @Body() dto: OpenCashPeriodDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.periods.open(dto, user, requestId || randomUUID());
  }
}

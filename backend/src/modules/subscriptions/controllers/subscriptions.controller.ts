import { Body, Controller, Get, Headers, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import { ChangeSubscriptionStatusDto, CreatePaymentDto, CreatePlanDto, CreateSubscriptionDto, ListPlansQueryDto, ListSubscriptionsQueryDto, PaymentTimelineQueryDto, UpdatePaymentDto, UpdatePlanDto } from '../dto/subscription.dto.js';
import { SubscriptionPaymentService } from '../services/subscription-payment.service.js';
import { SubscriptionPlanQueryService } from '../services/subscription-plan-query.service.js';
import { SubscriptionPlanService } from '../services/subscription-plan.service.js';
import { SubscriptionQueryService } from '../services/subscription-query.service.js';
import { SubscriptionService } from '../services/subscription.service.js';
@ApiTags('subscription-plans') @Controller('subscription-plans') export class SubscriptionPlansController {
 constructor(private readonly service:SubscriptionPlanService,private readonly query:SubscriptionPlanQueryService){}
 @Post() create(@Body() dto:CreatePlanDto){return this.service.create(dto);} @Get() list(@Query() q:ListPlansQueryDto){return this.query.list(q);} @Get(':id') get(@Param('id',ParseUUIDPipe) id:string){return this.query.getById(id);} @Patch(':id') update(@Param('id',ParseUUIDPipe) id:string,@Body() dto:UpdatePlanDto){return this.service.update(id,dto);} @Patch(':id/inactivate') inactivate(@Param('id',ParseUUIDPipe) id:string){return this.service.inactivate(id);} @Patch(':id/reactivate') reactivate(@Param('id',ParseUUIDPipe) id:string){return this.service.reactivate(id);}
}
@ApiTags('subscriptions') @Controller('subscriptions') export class SubscriptionsController {
 constructor(private readonly service:SubscriptionService,private readonly query:SubscriptionQueryService,private readonly payments:SubscriptionPaymentService){}
 @Post() create(@Body() dto:CreateSubscriptionDto){return this.service.create(dto);} @Get() list(@Query() q:ListSubscriptionsQueryDto){return this.query.list(q);} @Get(':id') get(@Param('id',ParseUUIDPipe) id:string){return this.query.getById(id);} @Patch(':id/status') status(@Param('id',ParseUUIDPipe) id:string,@Body() dto:ChangeSubscriptionStatusDto){return this.service.changeStatus(id,dto.status);} @Post(':id/payments') pay(@Param('id',ParseUUIDPipe) id:string,@Body() dto:CreatePaymentDto){return this.payments.create(id,dto);} @Get(':id/payments') listPayments(@Param('id',ParseUUIDPipe) id:string){return this.payments.list(id);}
 @Get(':subscriptionId/payments/:paymentId') payment(@Param('paymentId',ParseUUIDPipe) id:string){return this.payments.get(id);}
 @Patch(':subscriptionId/payments/:paymentId') updatePayment(@Param('paymentId',ParseUUIDPipe) id:string,@Body() dto:UpdatePaymentDto,@CurrentUser() user:AuthenticatedUser,@Headers('x-request-id') requestId?:string){return this.payments.update(id,dto,user,requestId||randomUUID());}
 @Get(':subscriptionId/payments/:paymentId/timeline') timeline(@Param('paymentId',ParseUUIDPipe) id:string,@Query() query:PaymentTimelineQueryDto){return this.payments.timeline(id,query.page,query.pageSize);}
}

import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import type { AuthenticatedUser } from '../../auth/entities/authenticated-user.entity.js';
import {
  MaintenanceListQueryDto,
  MaintenanceUpdateDto,
} from '../dto/maintenance.dto.js';
import { MaintenanceService } from '../services/maintenance.service.js';

/** Hub de manutenção de cadastros (seção Sistema). Só ADMIN. */
@ApiTags('maintenance')
@Roles('ADMIN')
@Controller('maintenance')
export class MaintenanceController {
  constructor(private readonly service: MaintenanceService) {}

  @Get('registrations') list(@Query() query: MaintenanceListQueryDto) {
    return this.service.list(query);
  }

  @Patch('registrations/:type/:id') update(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: MaintenanceUpdateDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.update(type, id, dto, user, requestId || randomUUID());
  }

  @Patch('registrations/:type/:id/inactivate') inactivate(
    @Param('type') type: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.inactivate(type, id, user, requestId || randomUUID());
  }

  @Patch('registrations/:type/:id/reactivate') reactivate(
    @Param('type') type: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('x-request-id') requestId?: string,
  ) {
    return this.service.reactivate(type, id, user, requestId || randomUUID());
  }
}

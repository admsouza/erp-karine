import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { ChangeAppointmentStatusDto } from '../dto/change-appointment-status.dto.js';
import { CreateAppointmentDto } from '../dto/create-appointment.dto.js';
import { AgendaDateQueryDto, ListAppointmentsQueryDto } from '../dto/list-appointments-query.dto.js';
import { UpdateAppointmentDto } from '../dto/update-appointment.dto.js';
import { AppointmentQueryService } from '../services/appointment-query.service.js';
import { AppointmentService } from '../services/appointment.service.js';

@ApiTags('appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly service: AppointmentService, private readonly query: AppointmentQueryService) {}

  @Post() create(@Body() dto: CreateAppointmentDto) { return this.service.create(dto); }

  @Get('agenda/diaria') daily(@Query() query: AgendaDateQueryDto) { return this.query.daily(query.date); }
  @Get('agenda/semanal') weekly(@Query() query: AgendaDateQueryDto) { return this.query.weekly(query.date); }

  @Get() list(@Query() query: ListAppointmentsQueryDto) {
    return this.query.list({
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      clientId: query.clientId,
      status: query.status,
    });
  }

  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return this.query.getById(id); }
  @Patch(':id') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateAppointmentDto) { return this.service.update(id, dto); }
  @Patch(':id/status') changeStatus(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeAppointmentStatusDto) {
    return this.service.changeStatus(id, dto.status);
  }
}

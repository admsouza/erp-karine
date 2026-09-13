import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../entities/authenticated-user.entity.js';
import { ChangeUserRoleDto, CreateUserDto, ListUsersQueryDto, ResetUserPasswordDto } from '../dto/user-admin.dto.js';
import { UserAdminService } from '../services/user-admin.service.js';

/**
 * Administração de usuários — **exclusiva do ADMIN**.
 *
 * Não existe `DELETE`: usuário se **inativa** (as sessões abertas caem na hora).
 */
@ApiTags('users')
@ApiCookieAuth('erp_session')
@Roles('ADMIN')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UserAdminService) {}

  @Get()
  @ApiOperation({ summary: 'Lista usuários com busca e filtros (ADMIN)' })
  list(@Query() query: ListUsersQueryDto) {
    return this.users.list(query);
  }

  @Post()
  @ApiOperation({ summary: 'Cria usuário com senha inicial e troca obrigatória (ADMIN)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() ator: AuthenticatedUser) {
    return this.users.create(dto, ator);
  }

  @Patch(':id/role')
  @ApiOperation({ summary: 'Troca o perfil do usuário (ADMIN)' })
  changeRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ChangeUserRoleDto, @CurrentUser() ator: AuthenticatedUser) {
    return this.users.changeRole(id, dto.role, ator);
  }

  @Patch(':id/inactivate')
  @ApiOperation({ summary: 'Inativa o usuário e encerra as sessões dele (ADMIN)' })
  inactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() ator: AuthenticatedUser) {
    return this.users.setActive(id, false, ator);
  }

  @Patch(':id/reactivate')
  @ApiOperation({ summary: 'Reativa o usuário (ADMIN)' })
  reactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() ator: AuthenticatedUser) {
    return this.users.setActive(id, true, ator);
  }

  @Post(':id/password')
  @ApiOperation({ summary: 'Redefine a senha (temporária) e encerra as sessões do usuário (ADMIN)' })
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetUserPasswordDto, @CurrentUser() ator: AuthenticatedUser) {
    return this.users.resetPassword(id, dto.password, ator);
  }
}

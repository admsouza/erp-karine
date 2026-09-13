import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsIn, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../../generated/prisma/client.js';
import { PaginationQueryDto } from '../../../common/pagination/pagination-query.dto.js';
import { SENHA_REGEX } from './change-password.dto.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const minusculas = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nome ou e-mail' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  /** Chega como texto na query string; `'true' | 'false'` evita o `Boolean('false') === true`. */
  @ApiPropertyOptional({ enum: ['true', 'false'] })
  @IsOptional()
  @IsIn(['true', 'false'])
  active?: 'true' | 'false';
}

export class CreateUserDto {
  @ApiProperty({ example: 'Maria Souza' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome.' })
  @MinLength(3)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'maria@clinica.local' })
  @Transform(minusculas)
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(160)
  email: string;

  @ApiProperty({ description: 'Senha inicial; o usuário será obrigado a trocá-la no primeiro acesso.' })
  @IsString()
  @Matches(SENHA_REGEX, { message: 'A senha deve ter ao menos 8 caracteres, com letras e números.' })
  password: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;
}

export class ChangeUserRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role: Role;
}

export class ResetUserPasswordDto {
  @ApiProperty({ description: 'Senha temporária; o usuário será obrigado a trocá-la no próximo acesso.' })
  @IsString()
  @Matches(SENHA_REGEX, { message: 'A senha deve ter ao menos 8 caracteres, com letras e números.' })
  password: string;
}

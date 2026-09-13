import { ApiProperty } from '@nestjs/swagger';
import type { AuthenticatedUser } from '../entities/authenticated-user.entity.js';

/** Dados do usuário logado — sem hash de senha, sem token. */
export class AuthUserDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty() email: string;
  @ApiProperty({ enum: ['ADMIN', 'USER'] }) role: string;
  @ApiProperty({ description: 'Se true, o app exige a troca de senha antes de usar.' })
  mustChangePassword: boolean;

  static from(user: AuthenticatedUser): AuthUserDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };
  }
}

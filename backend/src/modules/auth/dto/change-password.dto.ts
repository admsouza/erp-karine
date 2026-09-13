import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Regra de senha: 8+ caracteres com pelo menos uma letra e um número. */
export const SENHA_REGEX = /^(?=.*[A-Za-zÀ-ÿ])(?=.*\d).{8,72}$/;

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty({ message: 'Informe a senha atual.' })
  currentPassword: string;

  @ApiProperty({ description: 'Mínimo 8 caracteres, com letra e número.' })
  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter ao menos 8 caracteres.' })
  @MaxLength(72)
  @Matches(SENHA_REGEX, { message: 'A nova senha deve conter letras e números.' })
  newPassword: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator.js';

const trim = ({ value }: { value: unknown }): unknown => (typeof value === 'string' ? value.trim() : value);
const emptyToUndefined = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class CreateClientDto {
  @ApiProperty({ example: 'Maria da Silva', maxLength: 120 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'Informe o nome completo.' })
  @MaxLength(120)
  fullName: string;

  @ApiPropertyOptional({ example: '529.982.247-25', description: 'CPF com ou sem máscara' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsCpf()
  cpf?: string;

  @ApiPropertyOptional({ example: '1985-04-12', description: 'Data no formato AAAA-MM-DD' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data de nascimento deve estar no formato AAAA-MM-DD.' })
  birthDate?: string;

  @ApiPropertyOptional({ example: '(83) 99999-0000' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiPropertyOptional({ example: '(83) 98888-0000' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(20)
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'maria@email.com' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsEmail({}, { message: 'E-mail inválido.' })
  @MaxLength(120)
  email?: string;

  @ApiPropertyOptional({ example: 'Rua das Flores, 100 — João Pessoa/PB' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string;

  @ApiPropertyOptional({ example: 'Alergia a lidocaína.' })
  @Transform(emptyToUndefined)
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}

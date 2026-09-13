import { PartialType } from '@nestjs/swagger';
import { CreateProcedureDto } from './create-procedure.dto.js';

/** Edição parcial: os mesmos campos do cadastro, todos opcionais. */
export class UpdateProcedureDto extends PartialType(CreateProcedureDto) {}

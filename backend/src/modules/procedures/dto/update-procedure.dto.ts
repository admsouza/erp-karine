import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateProcedureDto } from './create-procedure.dto.js';

/**
 * Edição do cadastro do procedimento.
 *
 * O **valor não é editável aqui**: preço muda por vigência
 * (`POST /api/procedures/:id/prices`), para preservar a série histórica.
 */
export class UpdateProcedureDto extends PartialType(
  OmitType(CreateProcedureDto, ['initialValueCents'] as const),
) {}

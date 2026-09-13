import { PartialType } from '@nestjs/swagger';
import { CreateClientDto } from './create-client.dto.js';

/** Edição do cliente: todos os campos do cadastro, nenhum obrigatório. */
export class UpdateClientDto extends PartialType(CreateClientDto) {}

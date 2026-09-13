import { All, Controller, Module, NotFoundException } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

/**
 * Captura qualquer requisição /api/* não mapeada para que o 404 também saia
 * no envelope de erro padronizado da API (em vez do HTML do Express).
 *
 * IMPORTANTE: este módulo precisa ser o ÚLTIMO importado no AppModule.
 * O Nest registra as rotas na ordem de resolução dos módulos, e o curinga
 * `*path` só pode ser avaliado depois de todas as rotas reais.
 */
@ApiExcludeController()
@Controller()
export class NotFoundController {
  @All('*path')
  notFound(): never {
    throw new NotFoundException('Rota não encontrada na API.');
  }
}

@Module({
  controllers: [NotFoundController],
})
export class NotFoundModule {}

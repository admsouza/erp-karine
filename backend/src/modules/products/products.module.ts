import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { ProductsController } from './controllers/products.controller.js';
import { ProductRepository } from './repositories/product.repository.js';
import { ProductQueryService } from './services/product-query.service.js';
import { ProductService } from './services/product.service.js';

/**
 * Catálogo de produtos da clínica (vendidos além dos procedimentos).
 *
 * Depende de: `audit` (trilha).
 * Não depende de: nenhum outro módulo de domínio.
 * Expõe: `ProductQueryService` (contrato público) e `ProductService` (usado pela
 * Manutenção de cadastros).
 */
@Module({
  imports: [AuditModule],
  controllers: [ProductsController],
  providers: [ProductRepository, ProductService, ProductQueryService],
  exports: [ProductQueryService, ProductService],
})
export class ProductsModule {}

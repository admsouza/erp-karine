-- CreateEnum
CREATE TYPE "ProductCommercialUse" AS ENUM ('VENDA', 'COMPRA', 'AMBOS');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "commercialUse" "ProductCommercialUse" NOT NULL DEFAULT 'VENDA',
ADD COLUMN     "purchasePriceCents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_commercialUse_idx" ON "Product"("commercialUse");

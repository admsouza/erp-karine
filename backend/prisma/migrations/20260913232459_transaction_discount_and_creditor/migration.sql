-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENT', 'AMOUNT');

-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "counterparty" TEXT,
ADD COLUMN     "discountCents" INTEGER,
ADD COLUMN     "discountType" "DiscountType",
ADD COLUMN     "discountValue" INTEGER,
ADD COLUMN     "grossAmountCents" INTEGER;

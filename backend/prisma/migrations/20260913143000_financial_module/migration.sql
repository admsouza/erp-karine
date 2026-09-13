CREATE TYPE "FinancialTransactionType" AS ENUM ('RECEITA', 'DESPESA');
CREATE TYPE "FinancialStatus" AS ENUM ('PENDENTE', 'PAGO', 'CANCELADO');

ALTER TABLE "FinancialTransaction"
  ADD COLUMN "type" "FinancialTransactionType" NOT NULL DEFAULT 'RECEITA',
  ADD COLUMN "status" "FinancialStatus" NOT NULL DEFAULT 'PAGO',
  ADD COLUMN "procedureId" TEXT,
  ADD COLUMN "procedureName" TEXT,
  ADD COLUMN "subscriptionName" TEXT,
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE INDEX "FinancialTransaction_type_idx" ON "FinancialTransaction"("type");
CREATE INDEX "FinancialTransaction_status_idx" ON "FinancialTransaction"("status");

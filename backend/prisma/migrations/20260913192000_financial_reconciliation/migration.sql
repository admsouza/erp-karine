-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "adjustmentOfId" TEXT,
ADD COLUMN     "idempotencyKey" TEXT;

-- CreateTable
CREATE TABLE "FinancialReconciliation" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "expectedCents" INTEGER NOT NULL,
    "countedCents" INTEGER NOT NULL,
    "differenceCents" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialReconciliation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialReconciliation_periodId_accountId_createdAt_idx" ON "FinancialReconciliation"("periodId", "accountId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_idempotencyKey_key" ON "FinancialTransaction"("idempotencyKey");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_adjustmentOfId_fkey" FOREIGN KEY ("adjustmentOfId") REFERENCES "FinancialTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;


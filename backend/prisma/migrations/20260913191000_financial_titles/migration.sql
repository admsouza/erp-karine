-- CreateTable
CREATE TABLE "FinancialTitle" (
    "id" TEXT NOT NULL,
    "type" "FinancialTransactionType" NOT NULL,
    "description" TEXT NOT NULL,
    "counterparty" TEXT,
    "dueDate" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinancialSettlement" (
    "id" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "resourceAccountId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FinancialSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialTitle_type_dueDate_idx" ON "FinancialTitle"("type", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSettlement_transactionId_key" ON "FinancialSettlement"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "FinancialSettlement_idempotencyKey_key" ON "FinancialSettlement"("idempotencyKey");

-- CreateIndex
CREATE INDEX "FinancialSettlement_titleId_idx" ON "FinancialSettlement"("titleId");

-- AddForeignKey
ALTER TABLE "FinancialSettlement" ADD CONSTRAINT "FinancialSettlement_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "FinancialTitle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialSettlement" ADD CONSTRAINT "FinancialSettlement_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "FinancialTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


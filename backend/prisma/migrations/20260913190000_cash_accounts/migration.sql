-- CreateEnum
CREATE TYPE "ResourceAccountKind" AS ENUM ('CASH', 'BANK', 'CARD');

-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "resourceAccountId" TEXT;

-- CreateTable
CREATE TABLE "ResourceAccount" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ResourceAccountKind" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashPeriod" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashBalance" (
    "id" TEXT NOT NULL,
    "periodId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "openingCents" INTEGER NOT NULL DEFAULT 0,
    "incomingCents" INTEGER NOT NULL DEFAULT 0,
    "outgoingCents" INTEGER NOT NULL DEFAULT 0,
    "expectedCents" INTEGER NOT NULL DEFAULT 0,
    "countedCents" INTEGER,
    "differenceCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashBalance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResourceAccount_name_key" ON "ResourceAccount"("name");

-- CreateIndex
CREATE UNIQUE INDEX "CashPeriod_month_key" ON "CashPeriod"("month");

-- CreateIndex
CREATE UNIQUE INDEX "CashBalance_periodId_accountId_key" ON "CashBalance"("periodId", "accountId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_resourceAccountId_date_idx" ON "FinancialTransaction"("resourceAccountId", "date");

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_resourceAccountId_fkey" FOREIGN KEY ("resourceAccountId") REFERENCES "ResourceAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBalance" ADD CONSTRAINT "CashBalance_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "CashPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashBalance" ADD CONSTRAINT "CashBalance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ResourceAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


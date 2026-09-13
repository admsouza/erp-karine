-- AlterTable
ALTER TABLE "ClientSubscription" ADD COLUMN     "planName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "planPeriodicity" "Periodicity" NOT NULL DEFAULT 'MENSAL',
ADD COLUMN     "planSessionsPerPeriod" INTEGER;

-- Preserva o contrato de assinaturas eventualmente existentes antes desta migração.
UPDATE "ClientSubscription" AS subscription
SET "planName" = plan."name",
    "planPeriodicity" = plan."periodicity",
    "planSessionsPerPeriod" = plan."sessionsPerPeriod"
FROM "SubscriptionPlan" AS plan
WHERE plan."id" = subscription."planId";

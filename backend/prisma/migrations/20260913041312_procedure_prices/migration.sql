-- Valor de procedimento passa a ter vigência (série histórica).
--
-- Ordem importa: primeiro criamos a tabela de vigências, depois copiamos o valor
-- atual de cada procedimento para uma vigência em aberto (validFrom = data de
-- criação do procedimento) e só então removemos a coluna antiga. Sem esse
-- backfill os valores já cadastrados seriam perdidos.

-- CreateTable
CREATE TABLE "ProcedurePrice" (
    "id" TEXT NOT NULL,
    "procedureId" TEXT NOT NULL,
    "valueCents" INTEGER NOT NULL,
    "validFrom" DATE NOT NULL,
    "validTo" DATE,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProcedurePrice_pkey" PRIMARY KEY ("id")
);

-- Backfill: o valor único existente vira a primeira vigência de cada procedimento
INSERT INTO "ProcedurePrice" ("id", "procedureId", "valueCents", "validFrom", "validTo", "note", "createdAt", "updatedAt")
SELECT
    gen_random_uuid()::text,
    p."id",
    p."defaultValueCents",
    p."createdAt"::date,
    NULL,
    'Valor único migrado para vigência (série histórica de preços)',
    now(),
    now()
FROM "Procedure" p;

-- CreateIndex
CREATE INDEX "ProcedurePrice_procedureId_validFrom_idx" ON "ProcedurePrice"("procedureId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ProcedurePrice_procedureId_validFrom_key" ON "ProcedurePrice"("procedureId", "validFrom");

-- AddForeignKey
ALTER TABLE "ProcedurePrice" ADD CONSTRAINT "ProcedurePrice_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable (depois do backfill, para não perder dado)
ALTER TABLE "Procedure" DROP COLUMN "defaultValueCents";

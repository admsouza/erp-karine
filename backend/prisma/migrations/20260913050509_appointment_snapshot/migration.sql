-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "procedureUnit" "ProcedureUnit",
ADD COLUMN     "quantity" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "unitValueCents" INTEGER NOT NULL DEFAULT 0;

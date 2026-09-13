-- Fase 7 — protocolos clínicos. Migração exclusivamente aditiva.
CREATE TYPE "ProtocolStatus" AS ENUM ('EM_ANDAMENTO', 'CONCLUIDO', 'CANCELADO');

ALTER TABLE "Protocol"
  ADD COLUMN "clientName" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "procedureId" TEXT,
  ADD COLUMN "procedureName" TEXT,
  ADD COLUMN "status" "ProtocolStatus" NOT NULL DEFAULT 'EM_ANDAMENTO';

-- Snapshot seguro para eventuais fichas preexistentes, sem alterar o cliente dono.
UPDATE "Protocol" p
SET "clientName" = c."fullName"
FROM "Client" c
WHERE p."clientId" = c."id" AND p."clientName" = '';

ALTER TABLE "ProtocolSession"
  ADD COLUMN "procedureId" TEXT,
  ADD COLUMN "procedureName" TEXT,
  ADD COLUMN "appointmentId" TEXT,
  ADD COLUMN "appointmentSnapshot" TEXT,
  ADD COLUMN "professional" TEXT,
  ADD COLUMN "guidelines" TEXT;

CREATE INDEX "Protocol_procedureId_idx" ON "Protocol"("procedureId");
CREATE INDEX "Protocol_status_idx" ON "Protocol"("status");
CREATE INDEX "Protocol_active_idx" ON "Protocol"("active");
CREATE UNIQUE INDEX "ProtocolSession_appointmentId_key" ON "ProtocolSession"("appointmentId");
CREATE INDEX "ProtocolSession_procedureId_idx" ON "ProtocolSession"("procedureId");

ALTER TABLE "Protocol" ADD CONSTRAINT "Protocol_procedureId_fkey"
  FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtocolSession" ADD CONSTRAINT "ProtocolSession_procedureId_fkey"
  FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProtocolSession" ADD CONSTRAINT "ProtocolSession_appointmentId_fkey"
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

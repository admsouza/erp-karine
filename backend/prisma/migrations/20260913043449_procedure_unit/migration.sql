-- Unidade de medida do procedimento (por ela o valor unitário é cobrado).
--
-- Migração aditiva: os procedimentos já cadastrados entram como SESSAO (padrão)
-- e a unidade pode ser ajustada na tela do procedimento.

-- CreateEnum
CREATE TYPE "ProcedureUnit" AS ENUM ('SESSAO', 'APLICACAO', 'REGIAO', 'ML', 'UNIDADE', 'HORA', 'PACOTE');

-- AlterTable
ALTER TABLE "Procedure" ADD COLUMN "unit" "ProcedureUnit" NOT NULL DEFAULT 'SESSAO';

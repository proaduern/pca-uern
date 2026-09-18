-- AlterTable
ALTER TABLE "ConsolidacaoTecnica" ADD COLUMN IF NOT EXISTS "agenteContratacaoDesignadoId" TEXT;

-- AddForeignKey
ALTER TABLE "ConsolidacaoTecnica" ADD CONSTRAINT "ConsolidacaoTecnica_agenteContratacaoDesignadoId_fkey" FOREIGN KEY ("agenteContratacaoDesignadoId") REFERENCES "AgenteContratacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

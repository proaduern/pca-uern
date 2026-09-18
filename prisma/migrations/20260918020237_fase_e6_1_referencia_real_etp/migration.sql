-- AlterTable
-- Remove o campo de texto livre "ID do documento ETP" digitado pelo Setor
-- Técnico na consolidação — a referência real ao ETP passa a ser a relação
-- já existente ConsolidacaoTecnica.estudoTecnicoPreliminar (Fase E0).
ALTER TABLE "ConsolidacaoTecnica" DROP COLUMN IF EXISTS "idDocumentoETP";

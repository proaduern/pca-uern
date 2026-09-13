-- DropForeignKey
ALTER TABLE "StatusLicitacao" DROP CONSTRAINT "StatusLicitacao_criadoPorId_fkey";

-- AlterTable
ALTER TABLE "StatusLicitacao" ALTER COLUMN "criadoPorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "StatusLicitacao" ADD CONSTRAINT "StatusLicitacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Licitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

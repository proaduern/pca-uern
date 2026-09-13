-- CreateEnum
CREATE TYPE "StatusSolicitacao" AS ENUM ('PENDENTE', 'ACEITO', 'REJEITADO');

-- AlterTable
ALTER TABLE "ItemCatalogo" ADD COLUMN     "origemSolicitacao" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "SolicitacaoCatalogo" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "nomeResumido" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "marcaModelo" TEXT,
    "link" TEXT,
    "aplicacao" TEXT NOT NULL,
    "valorEstimado" DECIMAL(14,2) NOT NULL,
    "tipoBemSugerido" "TipoBem" NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'PENDENTE',
    "categoriaFinalId" TEXT,
    "itemFinal" TEXT,
    "valorFinal" DECIMAL(14,2),
    "tipoBemFinal" "TipoBem",
    "motivoRejeicao" TEXT,
    "analisadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitacaoCatalogo_unidadeId_idx" ON "SolicitacaoCatalogo"("unidadeId");

-- CreateIndex
CREATE INDEX "SolicitacaoCatalogo_status_idx" ON "SolicitacaoCatalogo"("status");

-- AddForeignKey
ALTER TABLE "SolicitacaoCatalogo" ADD CONSTRAINT "SolicitacaoCatalogo_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoCatalogo" ADD CONSTRAINT "SolicitacaoCatalogo_categoriaFinalId_fkey" FOREIGN KEY ("categoriaFinalId") REFERENCES "Categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

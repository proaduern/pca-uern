-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN IF NOT EXISTS "liberadaCotaGeralParaOP" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ItemCatalogo" ADD COLUMN IF NOT EXISTS "liberadoCotaGeralParaOP" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE IF NOT EXISTS "SolicitacaoAutorizacaoCotaGeral" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "dfdId" TEXT NOT NULL,
    "tipo" "TipoItemDfd" NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "itemCatalogoId" TEXT,
    "itemNomeLivre" TEXT,
    "quantidade" DECIMAL(12,2),
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "correlacao" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "status" "StatusSolicitacao" NOT NULL DEFAULT 'PENDENTE',
    "motivoRejeicao" TEXT,
    "analisadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitacaoAutorizacaoCotaGeral_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SolicitacaoAutorizacaoCotaGeral_unidadeId_idx" ON "SolicitacaoAutorizacaoCotaGeral"("unidadeId");

-- CreateIndex
CREATE INDEX "SolicitacaoAutorizacaoCotaGeral_dfdId_idx" ON "SolicitacaoAutorizacaoCotaGeral"("dfdId");

-- CreateIndex
CREATE INDEX "SolicitacaoAutorizacaoCotaGeral_status_idx" ON "SolicitacaoAutorizacaoCotaGeral"("status");

-- AddForeignKey
ALTER TABLE "SolicitacaoAutorizacaoCotaGeral" ADD CONSTRAINT "SolicitacaoAutorizacaoCotaGeral_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoAutorizacaoCotaGeral" ADD CONSTRAINT "SolicitacaoAutorizacaoCotaGeral_dfdId_fkey" FOREIGN KEY ("dfdId") REFERENCES "Dfd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoAutorizacaoCotaGeral" ADD CONSTRAINT "SolicitacaoAutorizacaoCotaGeral_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitacaoAutorizacaoCotaGeral" ADD CONSTRAINT "SolicitacaoAutorizacaoCotaGeral_itemCatalogoId_fkey" FOREIGN KEY ("itemCatalogoId") REFERENCES "ItemCatalogo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "PesquisaDePrecos" (
    "id" TEXT NOT NULL,
    "consolidacaoTecnicaId" TEXT NOT NULL,
    "metodologia" TEXT NOT NULL,
    "arquivoPdfNome" TEXT,
    "arquivoPdfTexto" TEXT,
    "status" "StatusDocumentoTecnico" NOT NULL DEFAULT 'RASCUNHO',
    "responsavelNome" TEXT,
    "responsavelMatricula" TEXT,
    "finalizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PesquisaDePrecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PesquisaPrecoItem" (
    "id" TEXT NOT NULL,
    "pesquisaDePrecosId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "item" TEXT NOT NULL,
    "quantidade" DECIMAL(14,2) NOT NULL,
    "valorUnitarioPesquisado" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "fontesConsultadas" TEXT NOT NULL,

    CONSTRAINT "PesquisaPrecoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PesquisaDePrecos_consolidacaoTecnicaId_key" ON "PesquisaDePrecos"("consolidacaoTecnicaId");

-- CreateIndex
CREATE INDEX "PesquisaPrecoItem_pesquisaDePrecosId_idx" ON "PesquisaPrecoItem"("pesquisaDePrecosId");

-- AddForeignKey
ALTER TABLE "PesquisaDePrecos" ADD CONSTRAINT "PesquisaDePrecos_consolidacaoTecnicaId_fkey" FOREIGN KEY ("consolidacaoTecnicaId") REFERENCES "ConsolidacaoTecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PesquisaPrecoItem" ADD CONSTRAINT "PesquisaPrecoItem_pesquisaDePrecosId_fkey" FOREIGN KEY ("pesquisaDePrecosId") REFERENCES "PesquisaDePrecos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

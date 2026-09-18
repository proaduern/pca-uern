-- CreateTable
CREATE TABLE IF NOT EXISTS "TermoReferencia" (
    "id" TEXT NOT NULL,
    "consolidacaoTecnicaId" TEXT NOT NULL,
    "requisitosContratacao" TEXT NOT NULL,
    "modeloExecucaoObjeto" TEXT NOT NULL,
    "modeloGestaoContrato" TEXT NOT NULL,
    "criteriosMedicaoPagamento" TEXT NOT NULL,
    "formaSelecaoFornecedor" TEXT NOT NULL,
    "exigenciasHabilitacao" TEXT NOT NULL,
    "adequacaoOrcamentaria" TEXT NOT NULL,
    "garantiaExecucao" TEXT NOT NULL,
    "status" "StatusDocumentoTecnico" NOT NULL DEFAULT 'RASCUNHO',
    "responsavelNome" TEXT,
    "responsavelMatricula" TEXT,
    "finalizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TermoReferencia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TermoReferencia_consolidacaoTecnicaId_key" ON "TermoReferencia"("consolidacaoTecnicaId");

-- AddForeignKey
ALTER TABLE "TermoReferencia" ADD CONSTRAINT "TermoReferencia_consolidacaoTecnicaId_fkey" FOREIGN KEY ("consolidacaoTecnicaId") REFERENCES "ConsolidacaoTecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

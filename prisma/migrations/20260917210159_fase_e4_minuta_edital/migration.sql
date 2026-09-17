-- CreateTable
CREATE TABLE IF NOT EXISTS "MinutaEdital" (
    "id" TEXT NOT NULL,
    "consolidacaoTecnicaId" TEXT NOT NULL,
    "condicoesParticipacao" TEXT NOT NULL,
    "credenciamento" TEXT NOT NULL,
    "apresentacaoProposta" TEXT NOT NULL,
    "julgamentoPropostas" TEXT NOT NULL,
    "documentosHabilitacao" TEXT NOT NULL,
    "recursosAdministrativos" TEXT NOT NULL,
    "sancoesAdministrativas" TEXT NOT NULL,
    "disposicoesGerais" TEXT NOT NULL,
    "status" "StatusDocumentoTecnico" NOT NULL DEFAULT 'RASCUNHO',
    "responsavelNome" TEXT,
    "responsavelMatricula" TEXT,
    "finalizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MinutaEdital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MinutaEdital_consolidacaoTecnicaId_key" ON "MinutaEdital"("consolidacaoTecnicaId");

-- AddForeignKey
ALTER TABLE "MinutaEdital" ADD CONSTRAINT "MinutaEdital_consolidacaoTecnicaId_fkey" FOREIGN KEY ("consolidacaoTecnicaId") REFERENCES "ConsolidacaoTecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

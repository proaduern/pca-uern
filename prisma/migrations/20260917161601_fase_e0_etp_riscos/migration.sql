-- CreateEnum
CREATE TYPE "StatusDocumentoTecnico" AS ENUM ('RASCUNHO', 'FINALIZADO');

-- CreateEnum
CREATE TYPE "FaseRisco" AS ENUM ('PLANEJAMENTO', 'SELECAO_FORNECEDOR', 'GESTAO_CONTRATO');

-- CreateEnum
CREATE TYPE "ProbabilidadeRisco" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- CreateEnum
CREATE TYPE "ImpactoRisco" AS ENUM ('BAIXO', 'MEDIO', 'ALTO');

-- CreateEnum
CREATE TYPE "NivelAceitacaoRisco" AS ENUM ('ACEITAVEL', 'ACEITACAO_INTERMEDIARIA', 'INACEITAVEL');

-- CreateTable
CREATE TABLE IF NOT EXISTS "EstudoTecnicoPreliminar" (
    "id" TEXT NOT NULL,
    "consolidacaoTecnicaId" TEXT NOT NULL,
    "objeto" TEXT NOT NULL,
    "localEntregaPrestacao" TEXT NOT NULL,
    "necessidadeContratacao" TEXT NOT NULL,
    "referenciaPca" TEXT NOT NULL,
    "requisitosContratacao" TEXT NOT NULL,
    "estimativaQuantidadesMemoria" TEXT NOT NULL,
    "levantamentoMercadoJustificativa" TEXT NOT NULL,
    "estimativaPreliminarPrecos" TEXT NOT NULL,
    "descricaoSolucaoCompleta" TEXT NOT NULL,
    "justificativaParcelamento" TEXT NOT NULL,
    "resultadosEsperados" TEXT NOT NULL,
    "providenciasAdministracao" TEXT NOT NULL,
    "contratacoesCorrelatas" TEXT NOT NULL,
    "impactosAmbientais" TEXT NOT NULL,
    "declaracaoViabilidade" TEXT NOT NULL,
    "status" "StatusDocumentoTecnico" NOT NULL DEFAULT 'RASCUNHO',
    "responsavelNome" TEXT,
    "responsavelMatricula" TEXT,
    "finalizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstudoTecnicoPreliminar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnaliseRiscos" (
    "id" TEXT NOT NULL,
    "consolidacaoTecnicaId" TEXT NOT NULL,
    "status" "StatusDocumentoTecnico" NOT NULL DEFAULT 'RASCUNHO',
    "responsavelNome" TEXT,
    "responsavelMatricula" TEXT,
    "finalizadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnaliseRiscos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "RiscoItem" (
    "id" TEXT NOT NULL,
    "analiseRiscosId" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "fase" "FaseRisco" NOT NULL,
    "descricao" TEXT NOT NULL,
    "danos" TEXT NOT NULL,
    "probabilidade" "ProbabilidadeRisco" NOT NULL,
    "impacto" "ImpactoRisco" NOT NULL,
    "nivelAceitacao" "NivelAceitacaoRisco" NOT NULL,
    "acoesPreventivas" TEXT NOT NULL,
    "acoesContingenciais" TEXT NOT NULL,
    "responsavel" TEXT NOT NULL,

    CONSTRAINT "RiscoItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EstudoTecnicoPreliminar_consolidacaoTecnicaId_key" ON "EstudoTecnicoPreliminar"("consolidacaoTecnicaId");

-- CreateIndex
CREATE UNIQUE INDEX "AnaliseRiscos_consolidacaoTecnicaId_key" ON "AnaliseRiscos"("consolidacaoTecnicaId");

-- CreateIndex
CREATE INDEX "RiscoItem_analiseRiscosId_idx" ON "RiscoItem"("analiseRiscosId");

-- AddForeignKey
ALTER TABLE "EstudoTecnicoPreliminar" ADD CONSTRAINT "EstudoTecnicoPreliminar_consolidacaoTecnicaId_fkey" FOREIGN KEY ("consolidacaoTecnicaId") REFERENCES "ConsolidacaoTecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnaliseRiscos" ADD CONSTRAINT "AnaliseRiscos_consolidacaoTecnicaId_fkey" FOREIGN KEY ("consolidacaoTecnicaId") REFERENCES "ConsolidacaoTecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiscoItem" ADD CONSTRAINT "RiscoItem_analiseRiscosId_fkey" FOREIGN KEY ("analiseRiscosId") REFERENCES "AnaliseRiscos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

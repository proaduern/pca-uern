/*
  Warnings:

  - You are about to drop the column `itemConsolidadoId` on the `ItemDfd` table. All the data in the column will be lost.
  - You are about to drop the `ItemConsolidado` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PrioridadeConsolidacao" AS ENUM ('ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "TipoContratacao" AS ENUM ('NORMAL', 'ATA');

-- DropForeignKey
ALTER TABLE "ItemConsolidado" DROP CONSTRAINT "ItemConsolidado_aprovadoPorId_fkey";

-- DropForeignKey
ALTER TABLE "ItemConsolidado" DROP CONSTRAINT "ItemConsolidado_categoriaId_fkey";

-- DropForeignKey
ALTER TABLE "ItemConsolidado" DROP CONSTRAINT "ItemConsolidado_pcaAno_fkey";

-- DropForeignKey
ALTER TABLE "ItemDfd" DROP CONSTRAINT "ItemDfd_itemConsolidadoId_fkey";

-- DropIndex
DROP INDEX "ItemDfd_itemConsolidadoId_idx";

-- AlterTable
ALTER TABLE "ItemDfd" DROP COLUMN "itemConsolidadoId",
ADD COLUMN     "consolidacaoTecnicaId" TEXT,
ADD COLUMN     "itemSubstituidoNome" TEXT,
ADD COLUMN     "itemSubstituidoTipoBem" "TipoBem",
ADD COLUMN     "itemSubstituidoValorUnit" DECIMAL(14,2),
ADD COLUMN     "substituicaoEm" TIMESTAMP(3),
ADD COLUMN     "substituicaoJustificativa" TEXT,
ADD COLUMN     "substituicaoPorId" TEXT;

-- AlterTable
ALTER TABLE "Pca" ADD COLUMN     "concluidoEm" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "SetorTecnico" ADD COLUMN     "unidadeId" TEXT,
ADD COLUMN     "vinculado" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "email" DROP NOT NULL,
ALTER COLUMN "senhaHash" DROP NOT NULL;

-- DropTable
DROP TABLE "ItemConsolidado";

-- DropEnum
DROP TYPE "StatusConsolidacao";

-- CreateTable
CREATE TABLE "Licitacoes" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "vinculado" BOOLEAN NOT NULL DEFAULT false,
    "unidadeId" TEXT,
    "email" TEXT,
    "senhaHash" TEXT,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Licitacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemTecnico" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "valorUnit" DECIMAL(14,2) NOT NULL,
    "quantidade" DECIMAL(12,2) NOT NULL,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "tipoBem" "TipoBem" NOT NULL,
    "correlacao" TEXT NOT NULL,
    "itemSubstituidoNome" TEXT,
    "itemSubstituidoValorUnit" DECIMAL(14,2),
    "itemSubstituidoTipoBem" "TipoBem",
    "substituicaoJustificativa" TEXT,
    "substituicaoEm" TIMESTAMP(3),
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consolidacaoTecnicaId" TEXT,

    CONSTRAINT "ItemTecnico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsolidacaoTecnica" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "setorTecnicoId" TEXT NOT NULL,
    "pcaAno" INTEGER NOT NULL,
    "processoSEI" TEXT NOT NULL,
    "idDocumentoETP" TEXT NOT NULL,
    "dataETP" DATE NOT NULL,
    "prioridade" "PrioridadeConsolidacao" NOT NULL,
    "tipoContratacao" "TipoContratacao" NOT NULL,
    "dataEsperadaConclusao" DATE NOT NULL,
    "codigoPca" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsolidacaoTecnica_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Licitacoes_email_key" ON "Licitacoes"("email");

-- CreateIndex
CREATE INDEX "ItemTecnico_categoriaId_idx" ON "ItemTecnico"("categoriaId");

-- CreateIndex
CREATE INDEX "ItemTecnico_consolidacaoTecnicaId_idx" ON "ItemTecnico"("consolidacaoTecnicaId");

-- CreateIndex
CREATE INDEX "ConsolidacaoTecnica_pcaAno_categoriaId_idx" ON "ConsolidacaoTecnica"("pcaAno", "categoriaId");

-- CreateIndex
CREATE INDEX "ItemDfd_consolidacaoTecnicaId_idx" ON "ItemDfd"("consolidacaoTecnicaId");

-- AddForeignKey
ALTER TABLE "SetorTecnico" ADD CONSTRAINT "SetorTecnico_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Licitacoes" ADD CONSTRAINT "Licitacoes_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDfd" ADD CONSTRAINT "ItemDfd_consolidacaoTecnicaId_fkey" FOREIGN KEY ("consolidacaoTecnicaId") REFERENCES "ConsolidacaoTecnica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDfd" ADD CONSTRAINT "ItemDfd_substituicaoPorId_fkey" FOREIGN KEY ("substituicaoPorId") REFERENCES "SetorTecnico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTecnico" ADD CONSTRAINT "ItemTecnico_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTecnico" ADD CONSTRAINT "ItemTecnico_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "SetorTecnico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTecnico" ADD CONSTRAINT "ItemTecnico_consolidacaoTecnicaId_fkey" FOREIGN KEY ("consolidacaoTecnicaId") REFERENCES "ConsolidacaoTecnica"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidacaoTecnica" ADD CONSTRAINT "ConsolidacaoTecnica_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidacaoTecnica" ADD CONSTRAINT "ConsolidacaoTecnica_setorTecnicoId_fkey" FOREIGN KEY ("setorTecnicoId") REFERENCES "SetorTecnico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidacaoTecnica" ADD CONSTRAINT "ConsolidacaoTecnica_pcaAno_fkey" FOREIGN KEY ("pcaAno") REFERENCES "Pca"("ano") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateEnum
CREATE TYPE "StatusConsolidacao" AS ENUM ('RASCUNHO', 'APROVADO');

-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "setorTecnicoId" TEXT;

-- AlterTable
ALTER TABLE "ItemDfd" ADD COLUMN     "itemConsolidadoId" TEXT;

-- CreateTable
CREATE TABLE "SetorTecnico" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetorTecnico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemConsolidado" (
    "id" TEXT NOT NULL,
    "pcaAno" INTEGER NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "chaveAgrupamento" TEXT NOT NULL,
    "nomeItem" TEXT NOT NULL,
    "quantidadeTotal" DECIMAL(12,2) NOT NULL,
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "status" "StatusConsolidacao" NOT NULL DEFAULT 'RASCUNHO',
    "aprovadoPorId" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemConsolidado_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetorTecnico_email_key" ON "SetorTecnico"("email");

-- CreateIndex
CREATE INDEX "ItemConsolidado_pcaAno_categoriaId_chaveAgrupamento_idx" ON "ItemConsolidado"("pcaAno", "categoriaId", "chaveAgrupamento");

-- CreateIndex
CREATE INDEX "ItemDfd_itemConsolidadoId_idx" ON "ItemDfd"("itemConsolidadoId");

-- AddForeignKey
ALTER TABLE "Categoria" ADD CONSTRAINT "Categoria_setorTecnicoId_fkey" FOREIGN KEY ("setorTecnicoId") REFERENCES "SetorTecnico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDfd" ADD CONSTRAINT "ItemDfd_itemConsolidadoId_fkey" FOREIGN KEY ("itemConsolidadoId") REFERENCES "ItemConsolidado"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemConsolidado" ADD CONSTRAINT "ItemConsolidado_pcaAno_fkey" FOREIGN KEY ("pcaAno") REFERENCES "Pca"("ano") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemConsolidado" ADD CONSTRAINT "ItemConsolidado_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemConsolidado" ADD CONSTRAINT "ItemConsolidado_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "SetorTecnico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

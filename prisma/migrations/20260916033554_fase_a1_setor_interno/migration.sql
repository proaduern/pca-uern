-- AlterTable
ALTER TABLE "Dfd" ADD COLUMN     "enviadoParaUnidadeEm" TIMESTAMP(3),
ADD COLUMN     "setorInternoId" TEXT;

-- CreateTable
CREATE TABLE "SetorInterno" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "cotaOP" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cotaGeral" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SetorInterno_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SetorInterno_email_key" ON "SetorInterno"("email");

-- CreateIndex
CREATE INDEX "SetorInterno_unidadeId_idx" ON "SetorInterno"("unidadeId");

-- CreateIndex
CREATE INDEX "Dfd_setorInternoId_idx" ON "Dfd"("setorInternoId");

-- AddForeignKey
ALTER TABLE "SetorInterno" ADD CONSTRAINT "SetorInterno_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dfd" ADD CONSTRAINT "Dfd_setorInternoId_fkey" FOREIGN KEY ("setorInternoId") REFERENCES "SetorInterno"("id") ON DELETE SET NULL ON UPDATE CASCADE;

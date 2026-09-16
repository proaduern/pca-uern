-- AlterTable
ALTER TABLE "Unidade" ADD COLUMN     "responsavelMatricula" TEXT,
ADD COLUMN     "responsavelNome" TEXT,
ADD COLUMN     "responsavelTelefone" TEXT;

-- AlterTable
ALTER TABLE "Dfd" ADD COLUMN     "numero" INTEGER;

-- Backfill: número sequencial por unidade/ano, atribuído pela ordem de
-- criação já existente — preserva a posição real de cada DFD já lançado.
UPDATE "Dfd" d
SET "numero" = sub.rn
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "unidadeId", "ano" ORDER BY "createdAt") AS rn
  FROM "Dfd"
) sub
WHERE d."id" = sub."id";

-- AlterTable
ALTER TABLE "Dfd" ALTER COLUMN "numero" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Dfd_unidadeId_ano_numero_key" ON "Dfd"("unidadeId", "ano", "numero");

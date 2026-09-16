-- AlterTable
-- IF NOT EXISTS: estes 3 campos também são adicionados, de forma
-- independente, pelo PR de cadastros (Fase A2/PR #2) — que já pode ter
-- rodado sua própria migration contra este mesmo banco de preview/produção.
ALTER TABLE "Unidade" ADD COLUMN IF NOT EXISTS     "responsavelMatricula" TEXT,
ADD COLUMN IF NOT EXISTS     "responsavelNome" TEXT,
ADD COLUMN IF NOT EXISTS     "responsavelTelefone" TEXT;

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

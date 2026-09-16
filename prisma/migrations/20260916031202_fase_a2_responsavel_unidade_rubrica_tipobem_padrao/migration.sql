-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "classificacaoRubrica" TEXT,
ADD COLUMN     "tipoBemPadrao" "TipoBem";

-- AlterTable
ALTER TABLE "Unidade" ADD COLUMN     "responsavelMatricula" TEXT,
ADD COLUMN     "responsavelNome" TEXT,
ADD COLUMN     "responsavelTelefone" TEXT;

-- Preserva o comportamento anterior (hardcode em lib/actions/dfd.ts): a
-- categoria "Livros" sempre tratou seu material de valor livre como bem
-- permanente. Agora isso é dado (Categoria.tipoBemPadrao), não código.
UPDATE "Categoria" SET "tipoBemPadrao" = 'PERMANENTE'
WHERE "nome" = 'Livros' AND "tipo" = 'MATERIAL' AND "semItem" = true;

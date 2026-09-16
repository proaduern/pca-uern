-- AlterTable
-- IF NOT EXISTS: este campo também é adicionado, de forma independente,
-- pelo PR de cadastros (Fase A2/PR #2) — que já pode ter rodado sua
-- própria migration contra este mesmo banco de preview/produção (ver o
-- mesmo problema e correção em 20260916141500_fase_c_numero_dfd_responsavel_unidade).
ALTER TABLE "Categoria" ADD COLUMN IF NOT EXISTS "classificacaoRubrica" TEXT;

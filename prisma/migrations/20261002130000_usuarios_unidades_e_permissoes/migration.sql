-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "RoleUsuario" AS ENUM ('ADMIN', 'UNIDADE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Usuario
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "role" "RoleUsuario" NOT NULL DEFAULT 'UNIDADE';
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "unidadeId" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "matricula" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "cargo" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "telefone" TEXT;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeCriarDfd" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeEditarDfd" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeEnviarDfd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeExcluirDfd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeSolicitarCatalogo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeSolicitarCotaGeral" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeConfirmarEntrega" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeGerenciarSetores" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "podeEditarDadosUnidade" BOOLEAN NOT NULL DEFAULT false;

-- Atualizar usuários existentes para ADMIN caso não tenham unidadeId
UPDATE "Usuario" SET "role" = 'ADMIN' WHERE "unidadeId" IS NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Usuario_unidadeId_idx" ON "Usuario"("unidadeId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Dfd
ALTER TABLE "Dfd" ADD COLUMN IF NOT EXISTS "criadoPorUsuarioId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Dfd_criadoPorUsuarioId_idx" ON "Dfd"("criadoPorUsuarioId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "Dfd" ADD CONSTRAINT "Dfd_criadoPorUsuarioId_fkey" FOREIGN KEY ("criadoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

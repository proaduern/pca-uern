-- CreateEnum
CREATE TYPE "RoleUsuario" AS ENUM ('ADMIN', 'UNIDADE');

-- AlterTable Usuario
ALTER TABLE "Usuario" ADD COLUMN "role" "RoleUsuario" NOT NULL DEFAULT 'UNIDADE';
ALTER TABLE "Usuario" ADD COLUMN "unidadeId" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "matricula" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "cargo" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "telefone" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN "ativo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN "podeCriarDfd" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN "podeEditarDfd" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN "podeEnviarDfd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "podeExcluirDfd" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "podeSolicitarCatalogo" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN "podeSolicitarCotaGeral" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "podeConfirmarEntrega" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Usuario" ADD COLUMN "podeGerenciarSetores" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "podeEditarDadosUnidade" BOOLEAN NOT NULL DEFAULT false;

-- Atualizar usuários existentes para ADMIN caso não tenham unidadeId
UPDATE "Usuario" SET "role" = 'ADMIN' WHERE "unidadeId" IS NULL;

-- CreateIndex
CREATE INDEX "Usuario_unidadeId_idx" ON "Usuario"("unidadeId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable Dfd
ALTER TABLE "Dfd" ADD COLUMN "criadoPorUsuarioId" TEXT;

-- CreateIndex
CREATE INDEX "Dfd_criadoPorUsuarioId_idx" ON "Dfd"("criadoPorUsuarioId");

-- AddForeignKey
ALTER TABLE "Dfd" ADD CONSTRAINT "Dfd_criadoPorUsuarioId_fkey" FOREIGN KEY ("criadoPorUsuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

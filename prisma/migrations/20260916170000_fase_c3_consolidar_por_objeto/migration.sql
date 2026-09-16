-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN IF NOT EXISTS "consolidarPorObjeto" BOOLEAN NOT NULL DEFAULT false;

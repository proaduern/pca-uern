-- CreateEnum
CREATE TYPE "ModoRestricao" AS ENUM ('TODAS', 'SOMENTE', 'EXCETO');

-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "restricaoModo" "ModoRestricao" NOT NULL DEFAULT 'TODAS';

-- AlterTable
ALTER TABLE "ItemCatalogo" ADD COLUMN     "restricaoModo" "ModoRestricao";

-- CreateTable
CREATE TABLE "_CategoriaRestricaoUnidades" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CategoriaRestricaoUnidades_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ItemCatalogoRestricaoUnidades" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ItemCatalogoRestricaoUnidades_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_CategoriaRestricaoUnidades_B_index" ON "_CategoriaRestricaoUnidades"("B");

-- CreateIndex
CREATE INDEX "_ItemCatalogoRestricaoUnidades_B_index" ON "_ItemCatalogoRestricaoUnidades"("B");

-- AddForeignKey
ALTER TABLE "_CategoriaRestricaoUnidades" ADD CONSTRAINT "_CategoriaRestricaoUnidades_A_fkey" FOREIGN KEY ("A") REFERENCES "Categoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CategoriaRestricaoUnidades" ADD CONSTRAINT "_CategoriaRestricaoUnidades_B_fkey" FOREIGN KEY ("B") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemCatalogoRestricaoUnidades" ADD CONSTRAINT "_ItemCatalogoRestricaoUnidades_A_fkey" FOREIGN KEY ("A") REFERENCES "ItemCatalogo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ItemCatalogoRestricaoUnidades" ADD CONSTRAINT "_ItemCatalogoRestricaoUnidades_B_fkey" FOREIGN KEY ("B") REFERENCES "Unidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

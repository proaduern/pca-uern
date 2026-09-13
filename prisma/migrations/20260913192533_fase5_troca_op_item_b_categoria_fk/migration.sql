/*
  Warnings:

  - You are about to drop the column `itemBCategoria` on the `TrocaOP` table. All the data in the column will be lost.
  - Added the required column `itemBCategoriaId` to the `TrocaOP` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TrocaOP" DROP COLUMN "itemBCategoria",
ADD COLUMN     "itemBCategoriaId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "TrocaOP" ADD CONSTRAINT "TrocaOP_itemBCategoriaId_fkey" FOREIGN KEY ("itemBCategoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

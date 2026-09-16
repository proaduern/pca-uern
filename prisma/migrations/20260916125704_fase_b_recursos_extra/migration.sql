-- AlterEnum
ALTER TYPE "Enquadramento" ADD VALUE 'RECURSOS_EXTRA';

-- AlterTable
ALTER TABLE "ItemDfd" ADD COLUMN     "recursoExtraAgencia" TEXT,
ADD COLUMN     "recursoExtraConta" TEXT;

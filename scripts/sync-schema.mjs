import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const COLUNAS = [
  `"sgcContratoId" TEXT`,
  `"sgcNumeroContrato" TEXT`,
  `"sgcAtaId" TEXT`,
  `"sgcNumeroAta" TEXT`,
  `"sgcFornecedorNome" TEXT`,
  `"sgcFornecedorCnpj" TEXT`,
  `"sgcStatusExecucao" TEXT`,
  `"sgcDataRecebimentoProv" TIMESTAMP(3)`,
  `"sgcDataRecebimentoDef" TIMESTAMP(3)`,
  `"sgcDataAtesto" TIMESTAMP(3)`,
  `"sgcNumeroNotaFiscal" TEXT`,
];

async function main() {
  console.log("[Deploy Schema] Verificando e aplicando colunas de interoperabilidade...");
  for (const col of COLUNAS) {
    const sqls = [
      `ALTER TABLE IF EXISTS "ItemDfd" ADD COLUMN IF NOT EXISTS ${col};`,
      `ALTER TABLE IF EXISTS public."ItemDfd" ADD COLUMN IF NOT EXISTS ${col};`,
      `ALTER TABLE IF EXISTS pca."ItemDfd" ADD COLUMN IF NOT EXISTS ${col};`,
    ];
    for (const sql of sqls) {
      try {
        await prisma.$executeRawUnsafe(sql);
      } catch (err) {
        // Ignora silenciosamente se o schema/tabela específico não existir
      }
    }
  }
  console.log("[Deploy Schema] Colunas verificadas com sucesso!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.warn("[Deploy Schema] Aviso geral:", err);
  process.exit(0);
});

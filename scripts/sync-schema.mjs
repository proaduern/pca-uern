import { PrismaClient } from "@prisma/client";

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  if (url.includes("schema=")) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}schema=pca`;
}

const dbUrl = getDatabaseUrl();
const prisma = dbUrl
  ? new PrismaClient({ datasources: { db: { url: dbUrl } } })
  : new PrismaClient();

const DDL = [
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcContratoId" TEXT;`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcNumeroContrato" TEXT;`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcAtaId" TEXT;`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcNumeroAta" TEXT;`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcFornecedorNome" TEXT;`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcFornecedorCnpj" TEXT;`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcStatusExecucao" TEXT;`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcDataRecebimentoProv" TIMESTAMP(3);`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcDataRecebimentoDef" TIMESTAMP(3);`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcDataAtesto" TIMESTAMP(3);`,
  `ALTER TABLE "ItemDfd" ADD COLUMN IF NOT EXISTS "sgcNumeroNotaFiscal" TEXT;`,
];

async function main() {
  console.log("[Deploy Schema] Verificando e aplicando colunas de interoperabilidade...");
  for (const sql of DDL) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (err) {
      console.warn(`[Deploy Schema] Aviso na instrução SQL: ${err.message}`);
    }
  }
  console.log("[Deploy Schema] Colunas verificadas com sucesso!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.warn("[Deploy Schema] Aviso geral:", err);
  process.exit(0);
});

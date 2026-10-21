import { PrismaClient } from "@prisma/client";
import { execSync } from "node:child_process";

const prisma = new PrismaClient();

const COLUNAS_ITEM_DFD = [
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
  `"valorUnitarioHomologado" DECIMAL(14,2)`,
  `"fornecedorVencedorCnpj" TEXT`,
  `"fornecedorVencedorNome" TEXT`,
  `"fornecedorVencedorEmail" TEXT`,
  `"fornecedorVencedorTelefone" TEXT`,
];

const COLUNAS_ITEM_TECNICO = [
  `"valorUnitarioHomologado" DECIMAL(14,2)`,
  `"fornecedorVencedorCnpj" TEXT`,
  `"fornecedorVencedorNome" TEXT`,
  `"fornecedorVencedorEmail" TEXT`,
  `"fornecedorVencedorTelefone" TEXT`,
];

const COLUNAS_CONSOLIDACAO = [
  `"editalDefinitivoGeradoEm" TIMESTAMP(3)`,
  `"editalDefinitivoObservacoes" TEXT`,
  `"aprovacaoAutoridadeSei" TEXT`,
  `"aprovacaoAutoridadeData" TIMESTAMP(3)`,
  `"publicacaoPncpCodigo" TEXT`,
  `"publicacaoPncpData" TIMESTAMP(3)`,
];

const VALORES_ENUM_STATUS_LICITACAO = [
  "MINUTA_CONTRATO",
  "MINUTA_ATA",
  "DILIGENCIAS_PGE",
  "EDITAL_DEFINITIVO",
];

async function executarSilencioso(sql) {
  try {
    await prisma.$executeRawUnsafe(sql);
  } catch {
    // Ignora se já existir ou schema não existir
  }
}

async function main() {
  console.log("[Deploy Schema] Sincronizando colunas e tabelas dos Subsistemas PROAD/PCA...");

  try {
    execSync("npx prisma db push --accept-data-loss --skip-generate", { stdio: "inherit" });
  } catch (e) {
    console.warn("[Deploy Schema] Aviso no prisma db push, aplicando migração SQL direta...");
  }

  for (const val of VALORES_ENUM_STATUS_LICITACAO) {
    await executarSilencioso(`ALTER TYPE "StatusLicitacaoValor" ADD VALUE IF NOT EXISTS '${val}';`);
    await executarSilencioso(`ALTER TYPE public."StatusLicitacaoValor" ADD VALUE IF NOT EXISTS '${val}';`);
    await executarSilencioso(`ALTER TYPE pca."StatusLicitacaoValor" ADD VALUE IF NOT EXISTS '${val}';`);
  }

  for (const col of COLUNAS_ITEM_DFD) {
    await executarSilencioso(`ALTER TABLE IF EXISTS "ItemDfd" ADD COLUMN IF NOT EXISTS ${col};`);
    await executarSilencioso(`ALTER TABLE IF EXISTS public."ItemDfd" ADD COLUMN IF NOT EXISTS ${col};`);
    await executarSilencioso(`ALTER TABLE IF EXISTS pca."ItemDfd" ADD COLUMN IF NOT EXISTS ${col};`);
  }

  for (const col of COLUNAS_ITEM_TECNICO) {
    await executarSilencioso(`ALTER TABLE IF EXISTS "ItemTecnico" ADD COLUMN IF NOT EXISTS ${col};`);
    await executarSilencioso(`ALTER TABLE IF EXISTS public."ItemTecnico" ADD COLUMN IF NOT EXISTS ${col};`);
    await executarSilencioso(`ALTER TABLE IF EXISTS pca."ItemTecnico" ADD COLUMN IF NOT EXISTS ${col};`);
  }

  for (const col of COLUNAS_CONSOLIDACAO) {
    await executarSilencioso(`ALTER TABLE IF EXISTS "ConsolidacaoTecnica" ADD COLUMN IF NOT EXISTS ${col};`);
    await executarSilencioso(`ALTER TABLE IF EXISTS public."ConsolidacaoTecnica" ADD COLUMN IF NOT EXISTS ${col};`);
    await executarSilencioso(`ALTER TABLE IF EXISTS pca."ConsolidacaoTecnica" ADD COLUMN IF NOT EXISTS ${col};`);
  }

  for (const schemaPrefix of ["", "public.", "pca."]) {
    await executarSilencioso(`
      CREATE TABLE IF NOT EXISTS ${schemaPrefix}"MinutaContrato" (
        "id" TEXT NOT NULL,
        "consolidacaoTecnicaId" TEXT NOT NULL,
        "clausulaVigenciaProrrogacao" TEXT NOT NULL,
        "clausulaDotacaoOrcamentaria" TEXT NOT NULL,
        "clausulaReajusteRepactuacao" TEXT NOT NULL,
        "clausulaGarantiaContratual" TEXT NOT NULL,
        "clausulaObrigacoesContratada" TEXT NOT NULL,
        "clausulaObrigacoesContratante" TEXT NOT NULL,
        "clausulaFiscalizacaoGestao" TEXT NOT NULL,
        "clausulaExtincaoForo" TEXT NOT NULL,
        "responsavelNome" TEXT,
        "responsavelMatricula" TEXT,
        "status" ${schemaPrefix}"StatusDocumentoTecnico" NOT NULL DEFAULT 'RASCUNHO',
        "finalizadoEm" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MinutaContrato_pkey" PRIMARY KEY ("id")
      );
    `);
    await executarSilencioso(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MinutaContrato_consolidacaoTecnicaId_key"
      ON ${schemaPrefix}"MinutaContrato"("consolidacaoTecnicaId");
    `);

    await executarSilencioso(`
      CREATE TABLE IF NOT EXISTS ${schemaPrefix}"MinutaAta" (
        "id" TEXT NOT NULL,
        "consolidacaoTecnicaId" TEXT NOT NULL,
        "clausulaValidadeAta" TEXT NOT NULL,
        "clausulaOrgaoGerenciadorParticipantes" TEXT NOT NULL,
        "clausulaAdesaoCarona" TEXT NOT NULL,
        "clausulaRevisaoCancelamentoPrecos" TEXT NOT NULL,
        "clausulaCadastroReserva" TEXT NOT NULL,
        "clausulaCondicoesFornecimento" TEXT NOT NULL,
        "clausulaPenalidadesAta" TEXT NOT NULL,
        "clausulaDisposicoesFinais" TEXT NOT NULL,
        "responsavelNome" TEXT,
        "responsavelMatricula" TEXT,
        "status" ${schemaPrefix}"StatusDocumentoTecnico" NOT NULL DEFAULT 'RASCUNHO',
        "finalizadoEm" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "MinutaAta_pkey" PRIMARY KEY ("id")
      );
    `);
    await executarSilencioso(`
      CREATE UNIQUE INDEX IF NOT EXISTS "MinutaAta_consolidacaoTecnicaId_key"
      ON ${schemaPrefix}"MinutaAta"("consolidacaoTecnicaId");
    `);

    await executarSilencioso(`
      CREATE TABLE IF NOT EXISTS ${schemaPrefix}"DiligenciaJuridica" (
        "id" TEXT NOT NULL,
        "consolidacaoTecnicaId" TEXT NOT NULL,
        "numeroParecerSei" TEXT NOT NULL,
        "dataParecer" TIMESTAMP(3) NOT NULL,
        "descricaoDiligencia" TEXT NOT NULL,
        "artefatosAfetados" TEXT[],
        "status" TEXT NOT NULL DEFAULT 'ABERTA',
        "atendidaEm" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "DiligenciaJuridica_pkey" PRIMARY KEY ("id")
      );
    `);
  }

  console.log("[Deploy Schema] Colunas e tabelas sincronizadas com sucesso!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.warn("[Deploy Schema] Aviso geral:", err);
  process.exit(0);
});

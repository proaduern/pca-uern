-- CreateEnum
CREATE TYPE "CotaTipo" AS ENUM ('FECHADA', 'ABERTA');

-- CreateEnum
CREATE TYPE "NivelPrioridade" AS ENUM ('ALTISSIMA', 'ALTA', 'MEDIA', 'BAIXA');

-- CreateEnum
CREATE TYPE "TipoCategoria" AS ENUM ('MATERIAL', 'SERVICO');

-- CreateEnum
CREATE TYPE "ModoServico" AS ENUM ('OBJETO', 'VALOR', 'ITENS');

-- CreateEnum
CREATE TYPE "TipoBem" AS ENUM ('CONSUMO', 'PERMANENTE');

-- CreateEnum
CREATE TYPE "StatusDfd" AS ENUM ('RASCUNHO', 'AGUARDANDO_APROVACAO', 'APROVADO', 'REPROVADO');

-- CreateEnum
CREATE TYPE "TipoDemanda" AS ENUM ('RENOVACAO', 'NOVA', 'FLUXO_CONTINUO');

-- CreateEnum
CREATE TYPE "TipoItemDfd" AS ENUM ('MATERIAL', 'SERVICO');

-- CreateEnum
CREATE TYPE "Enquadramento" AS ENUM ('OP', 'GERAL', 'CONVENIO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unidade" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "elegivelCotaOP" BOOLEAN NOT NULL DEFAULT false,
    "cotaOP" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cotaGeral" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cotaTipo" "CotaTipo" NOT NULL DEFAULT 'FECHADA',
    "verCotaGeralPCA" BOOLEAN NOT NULL DEFAULT false,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pca" (
    "ano" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "cotaGeral" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "cotaOP" DECIMAL(16,2) NOT NULL DEFAULT 0,
    "dataAbertura" DATE NOT NULL,
    "dataFechamento" DATE NOT NULL,
    "aberturaExtraGeral" BOOLEAN NOT NULL DEFAULT false,
    "concluido" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pca_pkey" PRIMARY KEY ("ano")
);

-- CreateTable
CREATE TABLE "PcaExcecao" (
    "id" TEXT NOT NULL,
    "pcaAno" INTEGER NOT NULL,
    "unidadeId" TEXT NOT NULL,

    CONSTRAINT "PcaExcecao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tipificacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,

    CONSTRAINT "Tipificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prioridade" (
    "id" TEXT NOT NULL,
    "frase" TEXT NOT NULL,
    "nivel" "NivelPrioridade" NOT NULL,

    CONSTRAINT "Prioridade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Categoria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "TipoCategoria" NOT NULL DEFAULT 'MATERIAL',
    "semItem" BOOLEAN NOT NULL DEFAULT false,
    "modoServico" "ModoServico" NOT NULL DEFAULT 'OBJETO',
    "fluxoContinuo" BOOLEAN NOT NULL DEFAULT false,
    "dependeContrato" BOOLEAN NOT NULL DEFAULT true,
    "saldoAnualGlobal" DECIMAL(16,2),
    "ignoraPCA" BOOLEAN NOT NULL DEFAULT false,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCatalogo" (
    "id" TEXT NOT NULL,
    "categoriaId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "tipoBem" "TipoBem" NOT NULL DEFAULT 'PERMANENTE',
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ItemCatalogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dfd" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "descricaoSumaria" TEXT NOT NULL,
    "tipificacaoId" TEXT,
    "prioridadeId" TEXT NOT NULL,
    "justificativa" TEXT NOT NULL,
    "tipoDemanda" "TipoDemanda" NOT NULL,
    "dataRenovacao" DATE,
    "dataEntrega" DATE,
    "status" "StatusDfd" NOT NULL DEFAULT 'RASCUNHO',
    "enviadoParaAprovacaoEm" TIMESTAMP(3),
    "aprovadoEm" TIMESTAMP(3),
    "reprovadoEm" TIMESTAMP(3),
    "motivoReprovacao" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Dfd_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemDfd" (
    "id" TEXT NOT NULL,
    "dfdId" TEXT NOT NULL,
    "tipo" "TipoItemDfd" NOT NULL,
    "enquadramento" "Enquadramento" NOT NULL DEFAULT 'GERAL',
    "convenioNumero" TEXT,
    "convenioAno" INTEGER,
    "emendaParlamentar" BOOLEAN NOT NULL DEFAULT false,
    "parlamentarNome" TEXT,
    "categoriaId" TEXT NOT NULL,
    "itemCatalogoNome" TEXT,
    "itemNomeLivre" TEXT,
    "tipoBem" "TipoBem",
    "quantidade" DECIMAL(12,2),
    "valorUnit" DECIMAL(14,2),
    "valorTotal" DECIMAL(14,2) NOT NULL,
    "correlacao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ItemDfd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Unidade_email_key" ON "Unidade"("email");

-- CreateIndex
CREATE UNIQUE INDEX "PcaExcecao_pcaAno_unidadeId_key" ON "PcaExcecao"("pcaAno", "unidadeId");

-- CreateIndex
CREATE UNIQUE INDEX "Tipificacao_nome_key" ON "Tipificacao"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Prioridade_frase_key" ON "Prioridade"("frase");

-- CreateIndex
CREATE UNIQUE INDEX "Categoria_nome_key" ON "Categoria"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCatalogo_categoriaId_item_key" ON "ItemCatalogo"("categoriaId", "item");

-- CreateIndex
CREATE INDEX "Dfd_unidadeId_idx" ON "Dfd"("unidadeId");

-- CreateIndex
CREATE INDEX "Dfd_status_idx" ON "Dfd"("status");

-- CreateIndex
CREATE INDEX "Dfd_ano_idx" ON "Dfd"("ano");

-- CreateIndex
CREATE INDEX "ItemDfd_dfdId_idx" ON "ItemDfd"("dfdId");

-- AddForeignKey
ALTER TABLE "PcaExcecao" ADD CONSTRAINT "PcaExcecao_pcaAno_fkey" FOREIGN KEY ("pcaAno") REFERENCES "Pca"("ano") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemCatalogo" ADD CONSTRAINT "ItemCatalogo_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dfd" ADD CONSTRAINT "Dfd_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dfd" ADD CONSTRAINT "Dfd_ano_fkey" FOREIGN KEY ("ano") REFERENCES "Pca"("ano") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dfd" ADD CONSTRAINT "Dfd_prioridadeId_fkey" FOREIGN KEY ("prioridadeId") REFERENCES "Prioridade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDfd" ADD CONSTRAINT "ItemDfd_dfdId_fkey" FOREIGN KEY ("dfdId") REFERENCES "Dfd"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDfd" ADD CONSTRAINT "ItemDfd_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

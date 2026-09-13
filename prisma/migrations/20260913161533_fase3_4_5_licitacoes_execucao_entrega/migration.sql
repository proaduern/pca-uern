-- CreateEnum
CREATE TYPE "SubperfilExecucao" AS ENUM ('OBRAS', 'SERVICOS', 'MATERIAIS_PATRIMONIO');

-- CreateEnum
CREATE TYPE "SubperfilEntrega" AS ENUM ('PATRIMONIO', 'ALMOXARIFADO');

-- CreateEnum
CREATE TYPE "StatusLicitacaoValor" AS ENUM ('PESQUISA_PRECOS', 'TERMO_REFERENCIA', 'DILIGENCIA_DEMANDANTE', 'MINUTAS', 'ANALISE_JURIDICA', 'DILIGENCIAS_PGE', 'SESSAO_MARCADA', 'ANALISE_PROPOSTAS', 'RECURSO', 'HOMOLOGADO', 'ASSINATURA_CONTRATO', 'REMETIDO_EXECUCAO', 'REMETIDO_GESTOR_ATA');

-- CreateEnum
CREATE TYPE "ResultadoHomologacao" AS ENUM ('SUCESSO', 'FRACASSADO', 'DESERTO');

-- CreateEnum
CREATE TYPE "StatusExecucaoValor" AS ENUM ('REMETIDO_FORNECEDOR', 'REJEITADA_FORNECEDOR', 'RECEBIDA_CONFERENCIA', 'RECEBIDA_DEFINITIVO');

-- CreateEnum
CREATE TYPE "StatusEntregaValor" AS ENUM ('EM_ESTOQUE', 'AUTORIZADO_PROAD', 'ENTREGA_ANDAMENTO', 'ENTREGUE');

-- CreateEnum
CREATE TYPE "StatusConfirmacaoEntrega" AS ENUM ('PENDENTE', 'CONFIRMADO', 'CONTESTACAO_PENDENTE_ENTREGA', 'CONTESTACAO_PENDENTE_ADMIN', 'CONTESTACAO_RATIFICADA', 'CONTESTACAO_REJEITADA');

-- CreateEnum
CREATE TYPE "StatusAtendimentoEstoque" AS ENUM ('PENDENTE_PROAD', 'APROVADO', 'REJEITADO');

-- CreateEnum
CREATE TYPE "StatusTrocaOP" AS ENUM ('PENDENTE_PROAD_INICIAL', 'REJEITADO_INICIAL', 'PENDENTE_PATRIMONIO', 'SEM_ESTOQUE', 'PENDENTE_PROAD_FINAL', 'REJEITADO_FINAL', 'APROVADO');

-- AlterTable
ALTER TABLE "Categoria" ADD COLUMN     "subperfilExecucaoOverride" "SubperfilExecucao";

-- AlterTable
ALTER TABLE "ConsolidacaoTecnica" ADD COLUMN     "ataAutorizadaEm" TIMESTAMP(3),
ADD COLUMN     "revisaoDataEsperadaConclusao" DATE,
ADD COLUMN     "revisaoEm" TIMESTAMP(3),
ADD COLUMN     "revisaoJustificativa" TEXT,
ADD COLUMN     "revisaoPorId" TEXT,
ADD COLUMN     "revisaoPrioridade" "PrioridadeConsolidacao",
ADD COLUMN     "solicitacaoExecucaoAtaEm" TIMESTAMP(3),
ADD COLUMN     "solicitacaoExecucaoAtaPorId" TEXT;

-- AlterTable
ALTER TABLE "ItemDfd" ADD COLUMN     "estoqueGeral" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estoqueGeralDesde" TIMESTAMP(3),
ADD COLUMN     "itemOrigemDivisaoId" TEXT,
ADD COLUMN     "processoExecucaoId" TEXT,
ADD COLUMN     "resultadoHomologacao" "ResultadoHomologacao",
ADD COLUMN     "valorAdjudicado" DECIMAL(14,2),
ADD COLUMN     "viaTrocaOP" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "ItemTecnico" ADD COLUMN     "itemOrigemDivisaoId" TEXT,
ADD COLUMN     "processoExecucaoId" TEXT,
ADD COLUMN     "resultadoHomologacao" "ResultadoHomologacao",
ADD COLUMN     "valorAdjudicado" DECIMAL(14,2);

-- CreateTable
CREATE TABLE "AcessoExecucao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "subperfil" "SubperfilExecucao" NOT NULL,
    "vinculado" BOOLEAN NOT NULL DEFAULT false,
    "unidadeId" TEXT,
    "email" TEXT,
    "senhaHash" TEXT,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcessoExecucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoEntrega" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "subperfil" "SubperfilEntrega" NOT NULL,
    "vinculado" BOOLEAN NOT NULL DEFAULT false,
    "unidadeId" TEXT,
    "email" TEXT,
    "senhaHash" TEXT,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcessoEntrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcessoGestorAta" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "vinculado" BOOLEAN NOT NULL DEFAULT false,
    "unidadeId" TEXT,
    "email" TEXT,
    "senhaHash" TEXT,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcessoGestorAta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusLicitacao" (
    "id" TEXT NOT NULL,
    "consolidacaoId" TEXT NOT NULL,
    "status" "StatusLicitacaoValor" NOT NULL,
    "responsavel" TEXT,
    "dataDiligencia" DATE,
    "prazoResposta" DATE,
    "dataSessao" DATE,
    "agenteNome" TEXT,
    "agenteMatricula" TEXT,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusLicitacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessoExecucao" (
    "id" TEXT NOT NULL,
    "consolidacaoId" TEXT NOT NULL,
    "subperfil" "SubperfilExecucao" NOT NULL,
    "acessoExecucaoId" TEXT NOT NULL,
    "processoSEIExecucao" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessoExecucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusExecucao" (
    "id" TEXT NOT NULL,
    "processoExecucaoId" TEXT NOT NULL,
    "status" "StatusExecucaoValor" NOT NULL,
    "dataEnvio" DATE,
    "prazoDias" INTEGER,
    "criadoPorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusExecucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrega" (
    "id" TEXT NOT NULL,
    "unidadeId" TEXT,
    "categoriaId" TEXT NOT NULL,
    "itemNome" TEXT NOT NULL,
    "enquadramento" "Enquadramento" NOT NULL,
    "tipoBem" "TipoBem",
    "subperfilBens" "SubperfilEntrega" NOT NULL,
    "valorAdjudicado" DECIMAL(14,2) NOT NULL,
    "processoExecucaoId" TEXT,
    "acessoEntregaId" TEXT,
    "itemDfdId" TEXT,
    "itemTecnicoId" TEXT,
    "viaEstoque" BOOLEAN NOT NULL DEFAULT false,
    "viaTrocaOP" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Entrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusEntrega" (
    "id" TEXT NOT NULL,
    "entregaId" TEXT NOT NULL,
    "status" "StatusEntregaValor" NOT NULL,
    "criadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusEntrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmacaoEntrega" (
    "id" TEXT NOT NULL,
    "entregaId" TEXT NOT NULL,
    "status" "StatusConfirmacaoEntrega" NOT NULL DEFAULT 'PENDENTE',
    "dataLimite" DATE NOT NULL,
    "confirmadoEm" TIMESTAMP(3),
    "contestacaoMotivo" TEXT,
    "contestacaoSolicitadoEm" TIMESTAMP(3),
    "contestacaoAnaliseEntregaOk" BOOLEAN,
    "contestacaoAnaliseEntregaComentario" TEXT,
    "contestacaoAnaliseEntregaPorId" TEXT,
    "contestacaoAnaliseEntregaEm" TIMESTAMP(3),
    "contestacaoAnaliseAdminOk" BOOLEAN,
    "contestacaoAnaliseAdminEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfirmacaoEntrega_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AtendimentoEstoque" (
    "id" TEXT NOT NULL,
    "itemDfdId" TEXT NOT NULL,
    "solicitadoPorId" TEXT NOT NULL,
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusAtendimentoEstoque" NOT NULL DEFAULT 'PENDENTE_PROAD',
    "motivoRejeicao" TEXT,
    "analisadoEm" TIMESTAMP(3),
    "entregaId" TEXT,

    CONSTRAINT "AtendimentoEstoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrocaOP" (
    "id" TEXT NOT NULL,
    "itemDfdId" TEXT NOT NULL,
    "status" "StatusTrocaOP" NOT NULL DEFAULT 'PENDENTE_PROAD_INICIAL',
    "justificativaDemandante" TEXT NOT NULL,
    "itemBOrigemCatalogo" BOOLEAN NOT NULL,
    "itemBCategoria" TEXT NOT NULL,
    "itemBNome" TEXT NOT NULL,
    "itemBValor" DECIMAL(14,2) NOT NULL,
    "itemBTipoBem" "TipoBem" NOT NULL,
    "analiseProadInicialOk" BOOLEAN,
    "analiseProadInicialMotivo" TEXT,
    "analiseProadInicialEm" TIMESTAMP(3),
    "analisePatrimonioDisponivel" BOOLEAN,
    "analisePatrimonioPorId" TEXT,
    "analisePatrimonioEm" TIMESTAMP(3),
    "analiseProadFinalOk" BOOLEAN,
    "analiseProadFinalMotivo" TEXT,
    "analiseProadFinalExtrapolou" BOOLEAN,
    "analiseProadFinalEm" TIMESTAMP(3),
    "itemNovoId" TEXT,
    "solicitadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrocaOP_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AcessoExecucao_email_key" ON "AcessoExecucao"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AcessoEntrega_email_key" ON "AcessoEntrega"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AcessoGestorAta_email_key" ON "AcessoGestorAta"("email");

-- CreateIndex
CREATE INDEX "StatusLicitacao_consolidacaoId_idx" ON "StatusLicitacao"("consolidacaoId");

-- CreateIndex
CREATE INDEX "ProcessoExecucao_consolidacaoId_idx" ON "ProcessoExecucao"("consolidacaoId");

-- CreateIndex
CREATE INDEX "StatusExecucao_processoExecucaoId_idx" ON "StatusExecucao"("processoExecucaoId");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_itemDfdId_key" ON "Entrega"("itemDfdId");

-- CreateIndex
CREATE UNIQUE INDEX "Entrega_itemTecnicoId_key" ON "Entrega"("itemTecnicoId");

-- CreateIndex
CREATE INDEX "Entrega_unidadeId_idx" ON "Entrega"("unidadeId");

-- CreateIndex
CREATE INDEX "StatusEntrega_entregaId_idx" ON "StatusEntrega"("entregaId");

-- CreateIndex
CREATE INDEX "ConfirmacaoEntrega_entregaId_idx" ON "ConfirmacaoEntrega"("entregaId");

-- CreateIndex
CREATE UNIQUE INDEX "AtendimentoEstoque_itemDfdId_key" ON "AtendimentoEstoque"("itemDfdId");

-- CreateIndex
CREATE UNIQUE INDEX "AtendimentoEstoque_entregaId_key" ON "AtendimentoEstoque"("entregaId");

-- CreateIndex
CREATE UNIQUE INDEX "TrocaOP_itemDfdId_key" ON "TrocaOP"("itemDfdId");

-- CreateIndex
CREATE UNIQUE INDEX "TrocaOP_itemNovoId_key" ON "TrocaOP"("itemNovoId");

-- CreateIndex
CREATE INDEX "TrocaOP_status_idx" ON "TrocaOP"("status");

-- CreateIndex
CREATE INDEX "ItemDfd_processoExecucaoId_idx" ON "ItemDfd"("processoExecucaoId");

-- CreateIndex
CREATE INDEX "ItemTecnico_processoExecucaoId_idx" ON "ItemTecnico"("processoExecucaoId");

-- AddForeignKey
ALTER TABLE "AcessoExecucao" ADD CONSTRAINT "AcessoExecucao_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoEntrega" ADD CONSTRAINT "AcessoEntrega_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcessoGestorAta" ADD CONSTRAINT "AcessoGestorAta_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDfd" ADD CONSTRAINT "ItemDfd_itemOrigemDivisaoId_fkey" FOREIGN KEY ("itemOrigemDivisaoId") REFERENCES "ItemDfd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDfd" ADD CONSTRAINT "ItemDfd_processoExecucaoId_fkey" FOREIGN KEY ("processoExecucaoId") REFERENCES "ProcessoExecucao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTecnico" ADD CONSTRAINT "ItemTecnico_itemOrigemDivisaoId_fkey" FOREIGN KEY ("itemOrigemDivisaoId") REFERENCES "ItemTecnico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemTecnico" ADD CONSTRAINT "ItemTecnico_processoExecucaoId_fkey" FOREIGN KEY ("processoExecucaoId") REFERENCES "ProcessoExecucao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidacaoTecnica" ADD CONSTRAINT "ConsolidacaoTecnica_revisaoPorId_fkey" FOREIGN KEY ("revisaoPorId") REFERENCES "Licitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsolidacaoTecnica" ADD CONSTRAINT "ConsolidacaoTecnica_solicitacaoExecucaoAtaPorId_fkey" FOREIGN KEY ("solicitacaoExecucaoAtaPorId") REFERENCES "AcessoGestorAta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusLicitacao" ADD CONSTRAINT "StatusLicitacao_consolidacaoId_fkey" FOREIGN KEY ("consolidacaoId") REFERENCES "ConsolidacaoTecnica"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusLicitacao" ADD CONSTRAINT "StatusLicitacao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "Licitacoes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoExecucao" ADD CONSTRAINT "ProcessoExecucao_consolidacaoId_fkey" FOREIGN KEY ("consolidacaoId") REFERENCES "ConsolidacaoTecnica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProcessoExecucao" ADD CONSTRAINT "ProcessoExecucao_acessoExecucaoId_fkey" FOREIGN KEY ("acessoExecucaoId") REFERENCES "AcessoExecucao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusExecucao" ADD CONSTRAINT "StatusExecucao_processoExecucaoId_fkey" FOREIGN KEY ("processoExecucaoId") REFERENCES "ProcessoExecucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusExecucao" ADD CONSTRAINT "StatusExecucao_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "AcessoExecucao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_unidadeId_fkey" FOREIGN KEY ("unidadeId") REFERENCES "Unidade"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_categoriaId_fkey" FOREIGN KEY ("categoriaId") REFERENCES "Categoria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_processoExecucaoId_fkey" FOREIGN KEY ("processoExecucaoId") REFERENCES "ProcessoExecucao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_acessoEntregaId_fkey" FOREIGN KEY ("acessoEntregaId") REFERENCES "AcessoEntrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_itemDfdId_fkey" FOREIGN KEY ("itemDfdId") REFERENCES "ItemDfd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrega" ADD CONSTRAINT "Entrega_itemTecnicoId_fkey" FOREIGN KEY ("itemTecnicoId") REFERENCES "ItemTecnico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEntrega" ADD CONSTRAINT "StatusEntrega_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "Entrega"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusEntrega" ADD CONSTRAINT "StatusEntrega_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "AcessoEntrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmacaoEntrega" ADD CONSTRAINT "ConfirmacaoEntrega_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "Entrega"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConfirmacaoEntrega" ADD CONSTRAINT "ConfirmacaoEntrega_contestacaoAnaliseEntregaPorId_fkey" FOREIGN KEY ("contestacaoAnaliseEntregaPorId") REFERENCES "AcessoEntrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoEstoque" ADD CONSTRAINT "AtendimentoEstoque_itemDfdId_fkey" FOREIGN KEY ("itemDfdId") REFERENCES "ItemDfd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoEstoque" ADD CONSTRAINT "AtendimentoEstoque_solicitadoPorId_fkey" FOREIGN KEY ("solicitadoPorId") REFERENCES "AcessoEntrega"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AtendimentoEstoque" ADD CONSTRAINT "AtendimentoEstoque_entregaId_fkey" FOREIGN KEY ("entregaId") REFERENCES "Entrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaOP" ADD CONSTRAINT "TrocaOP_itemDfdId_fkey" FOREIGN KEY ("itemDfdId") REFERENCES "ItemDfd"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaOP" ADD CONSTRAINT "TrocaOP_analisePatrimonioPorId_fkey" FOREIGN KEY ("analisePatrimonioPorId") REFERENCES "AcessoEntrega"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrocaOP" ADD CONSTRAINT "TrocaOP_itemNovoId_fkey" FOREIGN KEY ("itemNovoId") REFERENCES "ItemDfd"("id") ON DELETE SET NULL ON UPDATE CASCADE;

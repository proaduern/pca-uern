-- CreateTable
CREATE TABLE IF NOT EXISTS "PesquisaPrecos" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "vinculado" BOOLEAN NOT NULL DEFAULT false,
    "licitacoesId" TEXT,
    "email" TEXT,
    "senhaHash" TEXT,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PesquisaPrecos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Planejamento" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "vinculado" BOOLEAN NOT NULL DEFAULT false,
    "licitacoesId" TEXT,
    "email" TEXT,
    "senhaHash" TEXT,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Planejamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AgenteContratacao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "matricula" TEXT NOT NULL,
    "funcao" TEXT NOT NULL,
    "vinculado" BOOLEAN NOT NULL DEFAULT false,
    "licitacoesId" TEXT,
    "email" TEXT,
    "senhaHash" TEXT,
    "senhaTemporaria" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgenteContratacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PesquisaPrecos_email_key" ON "PesquisaPrecos"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Planejamento_email_key" ON "Planejamento"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AgenteContratacao_email_key" ON "AgenteContratacao"("email");

-- AddForeignKey
ALTER TABLE "PesquisaPrecos" ADD CONSTRAINT "PesquisaPrecos_licitacoesId_fkey" FOREIGN KEY ("licitacoesId") REFERENCES "Licitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Planejamento" ADD CONSTRAINT "Planejamento_licitacoesId_fkey" FOREIGN KEY ("licitacoesId") REFERENCES "Licitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgenteContratacao" ADD CONSTRAINT "AgenteContratacao_licitacoesId_fkey" FOREIGN KEY ("licitacoesId") REFERENCES "Licitacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

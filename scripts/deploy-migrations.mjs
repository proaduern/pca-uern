import { syncSchema } from "./sync-schema.mjs";
import { transporPca2027Oficial } from "./transpor-pca-2027-oficial.mjs";
import { sanearPrioridadesETipificacoes } from "./sanear-prioridades-e-tipificacoes.mjs";
import { seedCatalogo4Servicos } from "./seed-catalogo-4-servicos.mjs";
import { aplicarTitulosDfdsESeparacao } from "./aplicar-titulos-dfds-e-separacao.mjs";
import { sanearPrefixosEDuplicidadesCatalogo } from "./sanear-prefixos-e-duplicidades-catalogo.mjs";

async function main() {
  console.log("[Deploy Migrations] Iniciando sincronização e migrações no deploy...");
  try {
    await syncSchema();
  } catch (e) {
    console.warn("[Deploy Migrations] Aviso no syncSchema:", e);
  }

  try {
    await transporPca2027Oficial();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no transporPca2027Oficial:", e);
  }

  try {
    await sanearPrioridadesETipificacoes();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no sanearPrioridadesETipificacoes:", e);
  }

  try {
    await seedCatalogo4Servicos();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no seedCatalogo4Servicos:", e);
  }

  try {
    await aplicarTitulosDfdsESeparacao();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no aplicarTitulosDfdsESeparacao:", e);
  }

  try {
    await sanearPrefixosEDuplicidadesCatalogo();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no sanearPrefixosEDuplicidadesCatalogo:", e);
  }

  try {
    const { PrismaClient } = await import("@prisma/client");
    const p = new PrismaClient();
    const u = await p.unidade.findFirst({
      where: {
        OR: [
          { id: 'cmva9l5wl00023zmsofnlam7k' },
          { email: 'comissao.radiotv@uern.br' },
          { nome: { contains: 'Rádio e TV', mode: 'insensitive' } },
        ],
      },
    });
    if (u) {
      const s = await p.setorTecnico.findFirst({
        where: {
          OR: [
            { unidadeId: u.id },
            { nome: { contains: 'Comissão de TV e Rádio', mode: 'insensitive' } },
          ],
        },
      });
      if (!s) {
        await p.setorTecnico.create({
          data: {
            nome: 'Comissão de TV e Rádio',
            vinculado: true,
            unidadeId: u.id,
            ativo: true,
          },
        });
      }
    }
    await p.$disconnect();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no cadastrarComissaoTvRadio:", e);
  }
}

main();

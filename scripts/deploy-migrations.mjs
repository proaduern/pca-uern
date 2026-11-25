import { syncSchema } from "./sync-schema.mjs";
import { sanearCatalogoDefinitivo } from "./sanear-catalogo-definitivo.mjs";

async function main() {
  console.log("[Deploy Migrations] Iniciando sincronização e migrações no deploy...");
  try {
    await syncSchema();
  } catch (e) {
    console.warn("[Deploy Migrations] Aviso no syncSchema:", e);
  }

  // NOTA: As migrações de transposição inicial (transporPca2027Oficial, aplicarTitulosDfdsESeparacao, etc.)
  // foram desativadas permanentemente para NUNCA sobrescrever alterações manuais do usuário nos títulos e itens dos DFDs.
  try {
    await sanearCatalogoDefinitivo();
  } catch (e) {
    console.error("[Deploy Migrations] Erro no sanearCatalogoDefinitivo:", e);
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

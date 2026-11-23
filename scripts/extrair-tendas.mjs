import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tendas = await prisma.itemDfd.findMany({
    where: {
      categoria: { nome: { contains: 'Tendas', mode: 'insensitive' } },
      dfd: { ano: 2027 }
    },
    include: { categoria: true, dfd: { include: { unidade: true } } }
  });

  console.log(`=== TENDAS (${tendas.length} itens) ===`);
  tendas.forEach((it, idx) => {
    console.log(`[${idx+1}] Unidade: ${it.dfd.unidade.nome} | Qtd: ${it.quantidade} | Unit: R$ ${Number(it.valorUnit).toFixed(2)} | Total: R$ ${Number(it.valorTotal).toFixed(2)}`);
    console.log(`    ${it.itemNomeLivre || it.itemCatalogoNome}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());

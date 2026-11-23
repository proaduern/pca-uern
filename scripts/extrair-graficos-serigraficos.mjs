import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const serigrafia = await prisma.itemDfd.findMany({
    where: {
      categoria: { nome: 'Serviços Serigráficos' },
      dfd: { ano: 2027 }
    },
    include: { dfd: { include: { unidade: true } } }
  });

  console.log(`=== SERVIÇOS SERIGRÁFICOS (${serigrafia.length} itens) ===`);
  const seriGroup = {};
  serigrafia.forEach((it, idx) => {
    const nome = (it.itemNomeLivre || it.itemCatalogoNome || '').trim();
    const qtd = Number(it.quantidade || 1);
    const unit = Number(it.valorUnit || (Number(it.valorTotal) / qtd));
    const total = Number(it.valorTotal);
    console.log(`[${idx+1}] ${it.dfd.unidade.nome} | Qtd: ${qtd} | Unit: R$ ${unit.toFixed(2)} | Total: R$ ${total.toFixed(2)}`);
    console.log(`     ${nome.slice(0, 100)}`);
  });

  const graficos = await prisma.itemDfd.findMany({
    where: {
      categoria: { nome: 'Serviços Gráficos' },
      dfd: { ano: 2027 }
    },
    include: { dfd: { include: { unidade: true } } }
  });

  console.log(`\n=== SERVIÇOS GRÁFICOS (${graficos.length} itens) ===`);
  // Group by similar names or list unique types of items
  const tiposGraficos = new Map();
  graficos.forEach((it) => {
    const nome = (it.itemNomeLivre || it.itemCatalogoNome || '').trim();
    // Normalize first few words
    const prefix = nome.slice(0, 30).toLowerCase();
    if (!tiposGraficos.has(prefix)) tiposGraficos.set(prefix, []);
    tiposGraficos.get(prefix).push({
      nome,
      qtd: Number(it.quantidade || 1),
      unit: Number(it.valorUnit || 0),
      total: Number(it.valorTotal || 0)
    });
  });

  console.log(`Total de variações de prefixos em Serviços Gráficos: ${tiposGraficos.size}`);
  let count = 0;
  for (const [p, items] of tiposGraficos.entries()) {
    count++;
    if (count <= 25) {
      const avgUnit = items.reduce((a, b) => a + b.unit, 0) / items.length;
      console.log(`  [${count}] "${items[0].nome.slice(0, 70)}" (Ocorrências: ${items.length}, Preço médio unit: R$ ${avgUnit.toFixed(2)})`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

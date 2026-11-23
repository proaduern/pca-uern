import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.categoria.findMany({
    where: {
      OR: [
        { nome: { contains: 'Coffee', mode: 'insensitive' } },
        { nome: { contains: 'Tenda', mode: 'insensitive' } },
        { nome: { contains: 'Gráfico', mode: 'insensitive' } },
        { nome: { contains: 'Serigráfico', mode: 'insensitive' } }
      ]
    },
    include: {
      itensCatalogo: true
    }
  });

  console.log('=== CATEGORIAS NO BANCO ===');
  for (const c of cats) {
    console.log(`- ${c.nome} (ID: ${c.id}) | Tipo: ${c.tipo} | ModoServiço: ${c.modoServico} | SemItem: ${c.semItem} | Itens no Catálogo: ${c.itensCatalogo.length}`);
  }

  const catIds = cats.map(c => c.id);

  const itens = await prisma.itemDfd.findMany({
    where: {
      categoriaId: { in: catIds },
      dfd: { ano: 2027 }
    },
    include: {
      categoria: true,
      dfd: {
        include: { unidade: true }
      }
    }
  });

  console.log(`\n=== ITENS TRANSPOSTOS NO PCA 2027 (${itens.length} ITENS ENCONTRADOS) ===`);

  const porCategoria = {};
  for (const it of itens) {
    const catNome = it.categoria.nome;
    if (!porCategoria[catNome]) porCategoria[catNome] = [];
    porCategoria[catNome].push(it);
  }

  for (const [catNome, lista] of Object.entries(porCategoria)) {
    console.log(`\n------------------------------------------------------------`);
    console.log(`CATEGORIA: "${catNome}" (${lista.length} itens lançados no PCA 2027)`);
    console.log(`------------------------------------------------------------`);
    lista.forEach((it, idx) => {
      const nome = it.itemNomeLivre || it.itemCatalogoNome || '(Sem descrição)';
      const qtd = it.quantidade ? Number(it.quantidade) : 1;
      const unit = it.valorUnit ? Number(it.valorUnit) : (Number(it.valorTotal) / qtd);
      const total = Number(it.valorTotal);
      console.log(`[${idx + 1}] Unidade: ${it.dfd.unidade.nome} | Qtd: ${qtd} | Unit: R$ ${unit.toFixed(2)} | Total: R$ ${total.toFixed(2)}`);
      console.log(`    Descrição: ${nome.slice(0, 150)}`);
      if (nome.length > 150) console.log(`               ${nome.slice(150, 300)}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

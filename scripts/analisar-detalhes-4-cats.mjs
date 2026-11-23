import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.categoria.findMany({
    where: {
      nome: {
        in: [
          'Serviços de Fornecimento de Coffee break',
          'Serviços diversos para eventos - Tendas Tamanhos Diversos',
          'Serviços Gráficos',
          'Serviços Serigráficos'
        ]
      }
    }
  });

  const catMap = new Map(cats.map(c => [c.id, c]));

  const itens = await prisma.itemDfd.findMany({
    where: {
      categoriaId: { in: Array.from(catMap.keys()) },
      dfd: { ano: 2027 }
    },
    include: {
      dfd: { include: { unidade: true } }
    }
  });

  console.log(`Total itens encontrados nas 4 categorias: ${itens.length}`);

  const porCategoria = {
    'Serviços de Fornecimento de Coffee break': [],
    'Serviços diversos para eventos - Tendas Tamanhos Diversos': [],
    'Serviços Serigráficos': [],
    'Serviços Gráficos': []
  };

  for (const it of itens) {
    const c = catMap.get(it.categoriaId);
    if (c && porCategoria[c.nome]) {
      porCategoria[c.nome].push({
        unidade: it.dfd.unidade.nome,
        nome: it.itemNomeLivre || it.itemCatalogoNome || '',
        qtd: Number(it.quantidade || 1),
        unit: Number(it.valorUnit || (Number(it.valorTotal) / (Number(it.quantidade) || 1))),
        total: Number(it.valorTotal)
      });
    }
  }

  fs.writeFileSync('./scripts/data/itens-4-categorias.json', JSON.stringify(porCategoria, null, 2), 'utf8');
  console.log('Gravado em ./scripts/data/itens-4-categorias.json');
}

main().catch(console.error).finally(() => prisma.$disconnect());

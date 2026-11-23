import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ITENS_COFFEE_BREAK = [
  {
    item: 'Coffee Break Padrão I (15 pessoas)',
    valor: 172.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Coffee Break Padrão I (30 pessoas)',
    valor: 345.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Coffee Break Padrão II (50 pessoas)',
    valor: 750.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Coffee Break Padrão II (80 pessoas)',
    valor: 1000.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Coffee Break Padrão II (120 pessoas)',
    valor: 1540.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Coffee Break Padrão Festuern (100 pessoas)',
    valor: 1800.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Coffee Break Padrão III / Especial (120 pessoas)',
    valor: 2580.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Coffee Break para 200 pessoas',
    valor: 6800.00,
    tipoBem: 'CONSUMO'
  }
];

const ITENS_TENDAS = [
  {
    item: 'Tenda Piramidal 5x5m (Mossoró / Geral)',
    valor: 440.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Tenda Piramidal 5x5m (Demais Campi)',
    valor: 445.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Tenda Piramidal 6x6m (Mossoró / Geral)',
    valor: 550.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Tenda Piramidal 6x6m (Demais Campi)',
    valor: 570.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Tenda Piramidal 8x10m (Geral / Campi)',
    valor: 728.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Tenda Piramidal 10x10m (Mossoró / Geral)',
    valor: 770.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Tenda Piramidal 10x10m (Demais Campi)',
    valor: 850.00,
    tipoBem: 'CONSUMO'
  }
];

const ITENS_SERIGRAFICOS = [
  {
    item: 'Camiseta 100% Algodão Personalizada (P ao GG e Plus Size)',
    valor: 49.33,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Camiseta Malha PV Personalizada (67% poliéster / 33% viscose)',
    valor: 13.85,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Camiseta 100% Poliamida / Dry Fit UV',
    valor: 37.86,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Camisa Esportiva Dry Fit para Modalidades',
    valor: 43.33,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Conjunto Agasalho Esportivo (Jaqueta zíper + Calça Helanca)',
    valor: 379.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Kit Jogo Uniforme Esportivo (Camisa + Short/Calção)',
    valor: 180.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Sacola Ecobag Personalizada em TNT (45x35cm)',
    valor: 15.95,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Squeeze Flexível Atóxico Personalizado (300ml a 500ml)',
    valor: 7.57,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Troféu em Acrílico Personalizado (17x15cm)',
    valor: 21.00,
    tipoBem: 'CONSUMO'
  }
];

const ITENS_GRAFICOS = [
  {
    item: 'Banner Pequeno (60x90cm) com bastão e cordão',
    valor: 125.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Banner Médio (100x150cm) com acabamento em madeira e cordão',
    valor: 188.33,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Banner Grande (90x200cm ou 120x80cm) em lona fosca',
    valor: 260.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Wind Banner Modelo Vela Completo (2,7m / 1,8m com haste e base)',
    valor: 260.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Faixa em Lona com Madeira e Ilhós (0,80x3,5m)',
    valor: 180.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Lona para Backdrop com Fixação por Ilhós (3x2m)',
    valor: 890.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Folder Standard Couchê A4 com 2 ou 3 Dobras (4x4 cores)',
    valor: 0.73,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Panfleto / Flyer A5 (14,8x21cm) Couchê Liso 115g (4x4 cores)',
    valor: 0.25,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Cartaz A3 Colorido (42x29,7cm ou 62x46cm) Couchê 90g (4x0 cores)',
    valor: 2.17,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Crachá com Cordão Personalizado (10x15cm em off-set/PVC)',
    valor: 1.98,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Bloco de Anotações 10x15cm (Capa duplex 250g, 100 fls)',
    valor: 4.75,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Caderno de Notas Institucional com Elástico e Capa Dura',
    valor: 15.50,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Pasta de Escritório com Aba/Bolso (39x52cm aberta, papel 250g)',
    valor: 1.55,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Adesivo Vinil Redondo 5x5cm Lavável Recorte Eletrônico',
    valor: 0.30,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Adesivo Retangular em Papel 15x10cm Personalizado',
    valor: 0.55,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Caneta Plástica Personalizada com Logomarca',
    valor: 1.50,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Medalha Fundida com Fita Personalizada (75mm em liga zamac)',
    valor: 8.50,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Chaveiro em Acrílico Cortado a Laser Personalizado (2mm)',
    valor: 8.00,
    tipoBem: 'CONSUMO'
  },
  {
    item: 'Sacola Ecobag em Algodão Cru (34x34x10cm) Personalizada',
    valor: 6.20,
    tipoBem: 'CONSUMO'
  }
];

const CONFIGURACOES = [
  {
    nome: 'Serviços de Fornecimento de Coffee break',
    itens: ITENS_COFFEE_BREAK
  },
  {
    nome: 'Serviços diversos para eventos - Tendas Tamanhos Diversos',
    itens: ITENS_TENDAS
  },
  {
    nome: 'Serviços Serigráficos',
    itens: ITENS_SERIGRAFICOS
  },
  {
    nome: 'Serviços Gráficos',
    itens: ITENS_GRAFICOS
  }
];

export async function seedCatalogo4Servicos() {
  console.log('Iniciando atualização de categorias e catálogo de serviços...');

  for (const config of CONFIGURACOES) {
    const categoria = await prisma.categoria.findUnique({
      where: { nome: config.nome }
    });

    if (!categoria) {
      console.warn(`[AVISO] Categoria não encontrada: "${config.nome}"`);
      continue;
    }

    console.log(`\nAtualizando categoria: "${categoria.nome}" (ID: ${categoria.id})`);
    await prisma.categoria.update({
      where: { id: categoria.id },
      data: {
        modoServico: 'ITENS',
        semItem: false
      }
    });

    console.log(`Configurada como modoServico = 'ITENS' e semItem = false.`);

    // Inserir ou atualizar os itens de catálogo
    let inseridos = 0;
    let atualizados = 0;

    for (const itemDef of config.itens) {
      const existente = await prisma.itemCatalogo.findFirst({
        where: {
          categoriaId: categoria.id,
          item: itemDef.item
        }
      });

      if (existente) {
        await prisma.itemCatalogo.update({
          where: { id: existente.id },
          data: {
            valor: itemDef.valor,
            tipoBem: itemDef.tipoBem,
            ativo: true
          }
        });
        atualizados++;
      } else {
        await prisma.itemCatalogo.create({
          data: {
            categoriaId: categoria.id,
            item: itemDef.item,
            valor: itemDef.valor,
            tipoBem: itemDef.tipoBem,
            ativo: true
          }
        });
        inseridos++;
      }
    }

    const totalItens = await prisma.itemCatalogo.count({
      where: { categoriaId: categoria.id, ativo: true }
    });

    console.log(`Itens na categoria "${categoria.nome}": inseridos=${inseridos}, atualizados=${atualizados}, total ativo=${totalItens}`);
  }

  console.log('\nSeed do catálogo de serviços concluído com sucesso!');
}

if (process.argv[1]?.includes('seed-catalogo-4-servicos')) {
  seedCatalogo4Servicos()
    .catch((e) => {
      console.error('Erro ao executar seed:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

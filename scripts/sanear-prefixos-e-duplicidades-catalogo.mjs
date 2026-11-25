import { PrismaClient } from "@prisma/client";

const PREFIX_REGEX = /^(MOB|INFO|NFO|ELET|AV)\s*[-–—]\s*(.*)$/i;

function limparNome(nome) {
  if (!nome) return nome;
  const match = nome.match(PREFIX_REGEX);
  if (!match) return nome.trim();
  const resto = match[2].trim();
  return resto.charAt(0).toUpperCase() + resto.slice(1);
}

const MAPA_CLIMATIZACAO = [
  {
    padrao: "Ar-condicionado Split 9.000 BTUs Inverter",
    variacoes: [
      "CLIM - Ar-condicionado SPLIT 9 MIL BTUS",
      "Split Hi-Wall 9.000 BTUs Inverter",
      "Split Hi-Wall 9.000 BTUs Inverter (Unid.)",
      "Ar-condicionado SPLIT 9 MIL BTUS",
      "Ar-condicionado Split 9000 BTUs Inverter",
      "Ar-condicionado Split 9.000 BTUs"
    ],
    valorPadrao: 1648.00
  },
  {
    padrao: "Ar-condicionado Split 12.000 BTUs Inverter",
    variacoes: [
      "CLIM - Ar-condicionado SPLIT 12 MIL BTUS",
      "Split Hi-Wall 12.000 BTUs Inverter",
      "Split Hi-Wall 12.000 BTUs Inverter (Unid.)",
      "Ar-condicionado SPLIT 12 MIL BTUS",
      "Ar-condicionado Split 12000 BTUs Inverter",
      "Ar-condicionado Split 12.000 BTUs"
    ],
    valorPadrao: 2049.00
  },
  {
    padrao: "Ar-condicionado Split 18.000 BTUs Inverter",
    variacoes: [
      "CLIM - Ar-condicionado SPLIT 18 MIL BTUS",
      "Split Hi-Wall 18.000 BTUs Inverter",
      "Split Hi-Wall 18.000 BTUs Inverter (Unid.)",
      "Ar-condicionado SPLIT 18 MIL BTUS",
      "Ar-condicionado Split 18000 BTUs Inverter",
      "Ar-condicionado Split 18.000 BTUs"
    ],
    valorPadrao: 3030.00
  },
  {
    padrao: "Ar-condicionado Split 24.000 BTUs Inverter",
    variacoes: [
      "CLIM - Ar-condicionado SPLIT 24 MIL BTUS",
      "Split Hi-Wall 24.000 BTUs Inverter",
      "Split Hi-Wall 24.000 BTUs Inverter (Unid.)",
      "Ar-condicionado SPLIT 24 MIL BTUS",
      "Ar-condicionado Split 24000 BTUs Inverter",
      "Ar-condicionado Split 24.000 BTUs"
    ],
    valorPadrao: 6680.00
  },
  {
    padrao: "Ar-condicionado Split 30.000 BTUs Inverter",
    variacoes: [
      "CLIM - Ar-condicionado SPLIT 30 MIL BTUS",
      "Split Hi-Wall 30.000 BTUs Inverter",
      "Split Hi-Wall 30.000 BTUs Inverter (Unid.)",
      "Ar-condicionado SPLIT 30 MIL BTUS",
      "Ar-condicionado Split 30000 BTUs Inverter",
      "Ar-condicionado Split 30.000 BTUs"
    ],
    valorPadrao: 4850.00
  },
  {
    padrao: "Ar-condicionado Split Piso-Teto 24.000 BTUs Inverter",
    variacoes: [
      "CLIM - Ar-condicionado piso-teto 24 MIL BTUS",
      "Ar-condicionado piso-teto 24 MIL BTUS",
      "Split Piso-Teto 24.000 BTUs Inverter",
      "Split Piso-Teto 24.000 BTUs Inverter (Unid.)"
    ],
    valorPadrao: 6689.61
  },
  {
    padrao: "Ar-condicionado Split Cassete 36.000 BTUs Inverter",
    variacoes: [
      "Split Cassete 36.000 BTUs (Unid.)",
      "Split Cassete 36.000 BTUs",
      "Ar-condicionado Split Cassete 36.000 BTUs"
    ],
    valorPadrao: 10998.99
  },
  {
    padrao: "Ar-condicionado Split Piso-Teto 48.000 BTUs Inverter",
    variacoes: [
      "Split Piso-Teto 48.000 BTUs Inverter (Unid.)",
      "Split Piso-Teto 48.000 BTUs Inverter",
      "Ar-condicionado Split Piso-Teto 48.000 BTUs"
    ],
    valorPadrao: 11500.00
  },
  {
    padrao: "Ar-condicionado Split Piso-Teto 60.000 BTUs Inverter",
    variacoes: [
      "CLIM - Ar-condicionado piso-teto 60 MIL BTUS",
      "Ar-condicionado piso-teto 60 MIL BTUS",
      "Split Piso-Teto 60.000 BTUs Inverter",
      "Split Piso-Teto 60.000 BTUs Inverter (Unid.)"
    ],
    valorPadrao: 11288.69
  }
];

const ITENS_AV_RECLASSIFICAR = [
  "AV - WebCam para uso em reuniões acadêmicas e administrativas em geral",
  "AV - WebCam 4K para sistemas de TV e Rádio com Suporte",
  "AV - Fone de ouvido com microfone para uso em reuniões virtuais em geral",
  "AV - Fone de ouvido para uso profissional em Rádio e TV - ref. ÁudioTechnica ATH-M20X, P2",
  "AV - Fone de ouvido para uso profissional em eventos, curso de música e cursos da área de comunicação social",
  "AV - Gravador de voz tipo 01 para reuniões em geral - Ref. Sony ICD-PX240,",
  "AV - Gravador de podcast portátil com 4 entradas."
];

async function executarEmLotes(itens, tamanhoLote, fn) {
  for (let i = 0; i < itens.length; i += tamanhoLote) {
    const lote = itens.slice(i, i + tamanhoLote);
    await Promise.all(lote.map(fn));
  }
}

export async function sanearPrefixosEDuplicidadesCatalogo(prismaClient) {
  const prisma = prismaClient || new PrismaClient();
  console.log("\n=======================================================");
  console.log("=== INICIANDO SANEAMENTO DE PREFIXOS E DUPLICIDADES ===");
  console.log("=======================================================");

  const catAV = await prisma.categoria.findFirst({
    where: { nome: "Áudio e Vídeo - equipamentos e materiais" }
  });
  const catInfo = await prisma.categoria.findFirst({
    where: { nome: "Informática -Equipamentos" }
  });
  const catClim = await prisma.categoria.findFirst({
    where: { nome: "Climatização" }
  });

  if (!catAV || !catInfo || !catClim) {
    console.error("[Saneamento] Categorias fundamentais não encontradas. Abortando.");
    if (!prismaClient) await prisma.$disconnect();
    return;
  }

  // -------------------------------------------------------------
  // 1. RECLASSIFICAR ITENS AV DE INFORMÁTICA PARA ÁUDIO E VÍDEO
  // -------------------------------------------------------------
  console.log("\n[1/3] Revinculando itens de Áudio e Vídeo errados em Informática...");
  let avMigradosDfd = 0;

  for (const itemAvNome of ITENS_AV_RECLASSIFICAR) {
    const cleanName = limparNome(itemAvNome);

    // 1.1 Atualizar em ItemDfd (apenas a categoria e o nome limpo)
    const itensDfd = await prisma.itemDfd.findMany({
      where: {
        categoriaId: catInfo.id,
        OR: [
          { itemCatalogoNome: itemAvNome },
          { itemCatalogoNome: cleanName },
          { itemNomeLivre: itemAvNome },
          { itemNomeLivre: cleanName }
        ]
      }
    });

    for (const idfd of itensDfd) {
      await prisma.itemDfd.update({
        where: { id: idfd.id },
        data: {
          categoriaId: catAV.id,
          itemCatalogoNome: cleanName,
          ...(idfd.itemNomeLivre && PREFIX_REGEX.test(idfd.itemNomeLivre) ? { itemNomeLivre: cleanName } : {})
        }
      });
      avMigradosDfd++;
    }

    // 1.2 Limpar/unificar em ItemCatalogo
    const itensCatAV = await prisma.itemCatalogo.findMany({
      where: {
        categoriaId: catAV.id,
        OR: [{ item: itemAvNome }, { item: cleanName }]
      }
    });

    const itensCatInfo = await prisma.itemCatalogo.findMany({
      where: {
        categoriaId: catInfo.id,
        OR: [{ item: itemAvNome }, { item: cleanName }]
      }
    });

    // Se já existe um item exatamente com cleanName em catAV:
    let principalAV = itensCatAV.find(i => i.item === cleanName);

    // Se não existe com cleanName em catAV, mas existe com itemAvNome em catAV:
    if (!principalAV && itensCatAV.length > 0) {
      principalAV = await prisma.itemCatalogo.update({
        where: { id: itensCatAV[0].id },
        data: { item: cleanName }
      });
    }

    // Se ainda não existe nenhum em catAV, mas existe em catInfo:
    if (!principalAV && itensCatInfo.length > 0) {
      principalAV = await prisma.itemCatalogo.update({
        where: { id: itensCatInfo[0].id },
        data: {
          categoriaId: catAV.id,
          item: cleanName
        }
      });
    }

    // Se ainda não existe nenhum em lugar nenhum, criamos em catAV
    if (!principalAV) {
      principalAV = await prisma.itemCatalogo.create({
        data: {
          categoriaId: catAV.id,
          item: cleanName,
          tipoBem: "PERMANENTE",
          ativo: true,
          origemSolicitacao: false,
          liberadoCotaGeralParaOP: true
        }
      });
    }

    // Agora deletamos todos os outros itens duplicados em catAV e catInfo (exceto principalAV)
    for (const it of itensCatAV) {
      if (it.id !== principalAV.id) {
        await prisma.itemCatalogo.delete({ where: { id: it.id } });
      }
    }
    for (const it of itensCatInfo) {
      if (it.id !== principalAV.id) {
        await prisma.itemCatalogo.delete({ where: { id: it.id } });
      }
    }
  }
  console.log(`[1/3] Concluído! ${avMigradosDfd} itens de DFD revinculados para Áudio e Vídeo.`);

  // -------------------------------------------------------------
  // 2. PADRONIZAR AR-CONDICIONADOS EM CLIMATIZAÇÃO (BTUS INVERTER)
  // -------------------------------------------------------------
  console.log("\n[2/3] Padronizando ar-condicionados em Climatização (BTUs Inverter)...");
  let climAtualizadosDfd = 0;

  for (const grupo of MAPA_CLIMATIZACAO) {
    const nomePadrao = grupo.padrao;
    const variacoes = grupo.variacoes;

    let itemCatPadrao = await prisma.itemCatalogo.findFirst({
      where: {
        categoriaId: catClim.id,
        item: nomePadrao
      }
    });

    if (!itemCatPadrao) {
      const varExistente = await prisma.itemCatalogo.findFirst({
        where: {
          categoriaId: catClim.id,
          item: { in: variacoes }
        }
      });

      if (varExistente) {
        itemCatPadrao = await prisma.itemCatalogo.update({
          where: { id: varExistente.id },
          data: { item: nomePadrao, valor: grupo.valorPadrao, ativo: true }
        });
      } else {
        itemCatPadrao = await prisma.itemCatalogo.create({
          data: {
            categoriaId: catClim.id,
            item: nomePadrao,
            valor: grupo.valorPadrao,
            tipoBem: "PERMANENTE",
            ativo: true,
            origemSolicitacao: false,
            liberadoCotaGeralParaOP: true
          }
        });
      }
    }

    // Remover outras duplicatas no catálogo desta mesma variação
    const duplicatasCat = await prisma.itemCatalogo.findMany({
      where: {
        categoriaId: catClim.id,
        item: { in: variacoes },
        id: { not: itemCatPadrao.id }
      }
    });

    for (const dup of duplicatasCat) {
      await prisma.itemCatalogo.delete({ where: { id: dup.id } });
    }

    // Atualizar itens de DFD
    const itensDfdClim = await prisma.itemDfd.findMany({
      where: {
        categoriaId: catClim.id,
        OR: [
          { itemCatalogoNome: { in: variacoes } },
          { itemNomeLivre: { in: variacoes } }
        ]
      }
    });

    for (const it of itensDfdClim) {
      const dataUpdate = {};
      if (it.itemCatalogoNome && variacoes.includes(it.itemCatalogoNome)) {
        dataUpdate.itemCatalogoNome = nomePadrao;
      }
      if (it.itemNomeLivre && variacoes.includes(it.itemNomeLivre)) {
        dataUpdate.itemNomeLivre = nomePadrao;
      }
      if (Object.keys(dataUpdate).length > 0) {
        await prisma.itemDfd.update({
          where: { id: it.id },
          data: dataUpdate
        });
        climAtualizadosDfd++;
      }
    }
  }
  console.log(`[2/3] Concluído! ${climAtualizadosDfd} itens de ar-condicionado padronizados em DFDs.`);

  // -------------------------------------------------------------
  // 3. LIMPEZA GERAL DE PREFIXOS (MOB, INFO, NFO, ELET, AV)
  // -------------------------------------------------------------
  console.log("\n[3/3] Limpando prefixos restantes no Catálogo e nos DFDs...");

  // 3.1 ItemCatalogo
  const todosItensCatComSigla = await prisma.itemCatalogo.findMany({
    where: {
      OR: [
        { item: { startsWith: "MOB -" } },
        { item: { startsWith: "MOB-" } },
        { item: { startsWith: "INFO -" } },
        { item: { startsWith: "INFO-" } },
        { item: { startsWith: "NFO -" } },
        { item: { startsWith: "NFO-" } },
        { item: { startsWith: "ELET -" } },
        { item: { startsWith: "ELET-" } },
        { item: { startsWith: "AV -" } },
        { item: { startsWith: "AV-" } },
        { item: { startsWith: "CLIM -" } },
        { item: { startsWith: "CLIM-" } }
      ]
    }
  });

  let catLimpos = 0;
  for (const it of todosItensCatComSigla) {
    const itemAtual = await prisma.itemCatalogo.findUnique({ where: { id: it.id } });
    if (!itemAtual) continue;

    const nomeLimpo = limparNome(itemAtual.item);

    const existe = await prisma.itemCatalogo.findFirst({
      where: {
        categoriaId: itemAtual.categoriaId,
        item: nomeLimpo,
        id: { not: itemAtual.id }
      }
    });

    if (existe) {
      await prisma.itemCatalogo.delete({ where: { id: itemAtual.id } });
    } else {
      await prisma.itemCatalogo.update({
        where: { id: itemAtual.id },
        data: { item: nomeLimpo }
      });
    }
    catLimpos++;
  }
  console.log(`[3/3] Catálogo: ${catLimpos} itens com prefixo limpos/consolidados.`);

  // 3.2 ItemDfd em lotes concorrentes de 25
  const itensDfdComSigla = await prisma.itemDfd.findMany({
    where: {
      OR: [
        { itemCatalogoNome: { startsWith: "MOB -" } },
        { itemCatalogoNome: { startsWith: "MOB-" } },
        { itemCatalogoNome: { startsWith: "INFO -" } },
        { itemCatalogoNome: { startsWith: "INFO-" } },
        { itemCatalogoNome: { startsWith: "NFO -" } },
        { itemCatalogoNome: { startsWith: "NFO-" } },
        { itemCatalogoNome: { startsWith: "ELET -" } },
        { itemCatalogoNome: { startsWith: "ELET-" } },
        { itemCatalogoNome: { startsWith: "AV -" } },
        { itemCatalogoNome: { startsWith: "AV-" } },
        { itemCatalogoNome: { startsWith: "CLIM -" } },
        { itemCatalogoNome: { startsWith: "CLIM-" } },
        { itemNomeLivre: { startsWith: "MOB -" } },
        { itemNomeLivre: { startsWith: "MOB-" } },
        { itemNomeLivre: { startsWith: "INFO -" } },
        { itemNomeLivre: { startsWith: "INFO-" } },
        { itemNomeLivre: { startsWith: "NFO -" } },
        { itemNomeLivre: { startsWith: "NFO-" } },
        { itemNomeLivre: { startsWith: "ELET -" } },
        { itemNomeLivre: { startsWith: "ELET-" } },
        { itemNomeLivre: { startsWith: "AV -" } },
        { itemNomeLivre: { startsWith: "AV-" } },
        { itemNomeLivre: { startsWith: "CLIM -" } },
        { itemNomeLivre: { startsWith: "CLIM-" } }
      ]
    }
  });

  let dfdLimpos = 0;
  await executarEmLotes(itensDfdComSigla, 25, async (it) => {
    const dataUpdate = {};
    if (it.itemCatalogoNome && PREFIX_REGEX.test(it.itemCatalogoNome)) {
      dataUpdate.itemCatalogoNome = limparNome(it.itemCatalogoNome);
    }
    if (it.itemNomeLivre && PREFIX_REGEX.test(it.itemNomeLivre)) {
      dataUpdate.itemNomeLivre = limparNome(it.itemNomeLivre);
    }

    if (Object.keys(dataUpdate).length > 0) {
      await prisma.itemDfd.update({
        where: { id: it.id },
        data: dataUpdate
      });
      dfdLimpos++;
    }
  });

  console.log(`[3/3] DFDs: ${dfdLimpos} itens atualizados com nomes limpos.`);
  console.log("\n=== SANEAMENTO CONCLUÍDO COM SUCESSO! ===");

  if (!prismaClient) {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].includes("sanear-prefixos-e-duplicidades-catalogo")) {
  sanearPrefixosEDuplicidadesCatalogo()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

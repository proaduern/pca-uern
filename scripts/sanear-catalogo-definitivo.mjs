import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SIGLA_REGEX = /^(LAB\s+CONSUMO|LAB\s+EQUIP|MOB|INFO|NFO|ELET|AV|CLIM)\s*([-–—:]\s*|\s+)/i;

export function limparNomeCatalogo(str) {
  let s = String(str || "").trim();
  if (s.startsWith('"') && s.endsWith('"')) s = s.slice(1, -1).trim();
  else if (s.startsWith('"')) s = s.replace(/^"+/, "").trim();

  while (SIGLA_REGEX.test(s)) {
    s = s.replace(SIGLA_REGEX, "").trim();
  }

  // Remover "- MOB - ..." concatenado no final
  s = s.replace(/\s+-\s+(MOB|INFO|ELET|AV|CLIM|LAB\s+EQUIP|LAB\s+CONSUMO)\s+-\s+.*$/i, "").trim();

  // Normalizar quebras de linha e espaços múltiplos
  s = s.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();

  if (s.length > 0) {
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

export function normKey(str) {
  return limparNomeCatalogo(str)
    .replace(/[;,\.\-–—\/\(\):'"º°]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function executarEmLotes(itens, tamanhoLote, fn) {
  for (let i = 0; i < itens.length; i += tamanhoLote) {
    const lote = itens.slice(i, i + tamanhoLote);
    await Promise.all(lote.map(fn));
  }
}

async function atualizarItemCatalogoSeguro(prisma, id, categoriaId, novoNome, novoValor) {
  const atual = await prisma.itemCatalogo.findUnique({ where: { id } });
  if (!atual) return;

  const colisao = await prisma.itemCatalogo.findFirst({
    where: {
      categoriaId,
      item: novoNome,
      id: { not: id }
    }
  });

  if (colisao) {
    // Mantém o que já está com o nome/categoria certos, atualiza o valor fidedigno e remove o redundante
    const valFidedigno = Math.max(Number(novoValor || 0), Number(colisao.valor || 0) < 50 && Number(novoValor || 0) > 500 ? Number(novoValor) : Number(novoValor));
    await prisma.itemCatalogo.update({
      where: { id: colisao.id },
      data: { valor: valFidedigno, ativo: true }
    });
    await prisma.itemCatalogo.delete({ where: { id } });
  } else {
    await prisma.itemCatalogo.update({
      where: { id },
      data: {
        categoriaId,
        item: novoNome,
        valor: novoValor,
        ativo: true
      }
    });
  }
}

export async function sanearCatalogoDefinitivo(prismaClient) {
  const prisma = prismaClient || new PrismaClient();
  console.log("\n=======================================================");
  console.log("=== INICIANDO SANEAMENTO DEFINITIVO DO CATÁLOGO PCA ===");
  console.log("=======================================================");

  try {
    // Carregar mapa de preços da planilha oficial PCA 2027 para restaurar centavos exatos
    const payloadFile = path.resolve(__dirname, "data/pca2027-preparado.json");
    const mapaPlanilha = new Map();
    if (fs.existsSync(payloadFile)) {
      const payload = JSON.parse(fs.readFileSync(payloadFile, "utf8"));
      for (const it of payload.itensGeral || []) {
        const k = normKey(it.especificacao);
        if (!mapaPlanilha.has(k)) {
          mapaPlanilha.set(k, []);
        }
        if (it.valorUnitario > 0) {
          mapaPlanilha.get(k).push(Number(it.valorUnitario));
        }
      }
    }

    // -------------------------------------------------------------------------
    // 1. AJUSTES ESPECÍFICOS DETERMINADOS PELO USUÁRIO
    //    - Mobília: "A definir" (R$ 975,61) -> "Poltrona fixa para auditório, com braço, assento rebatível e prancheta escamoteável"
    //    - Informática: Chromebooks -> "Laboratório educacional móvel com 40 Chromebooks cada, com software de gestão de ensino, aprendizagem e avaliação" (10 un x R$ 120.000,00 no DFD e R$ 120.000,00 no Catálogo)
    //    - Informática: Datacenter (R$ 4.000.000,00) -> remover do Catálogo, manter no DFD da STI
    //    - Acervo Bibliográfico (9 itens) e Aquisição Veículos (1 item) -> remover do Catálogo, manter nos DFDs
    // -------------------------------------------------------------------------
    console.log("\n[1/5] Aplicando ajustes específicos (Poltrona Caicó, Chromebooks STI, Datacenter, Acervo e Veículos)...");

    const NOME_POLTRONA_CAICO = "Poltrona fixa para auditório, com braço, assento rebatível e prancheta escamoteável";
    const NOME_LAB_CHROMEBOOKS = "Laboratório educacional móvel com 40 Chromebooks cada, com software de gestão de ensino, aprendizagem e avaliação";
    const NOME_DATACENTER = "Registro de preços para aquisição de equipamentos para criação de Datacenter institucional.";

    // 1.1 Mobília: "A definir" -> Poltrona fixa para auditório...
    const catMobilia = await prisma.categoria.findFirst({ where: { nome: "Mobília" } });
    if (catMobilia) {
      const itensCatADefinir = await prisma.itemCatalogo.findMany({
        where: {
          categoriaId: catMobilia.id,
          OR: [
            { item: { equals: "A definir", mode: "insensitive" } },
            { item: { equals: NOME_POLTRONA_CAICO, mode: "insensitive" } }
          ]
        }
      });

      if (itensCatADefinir.length > 0) {
        const principal = itensCatADefinir[0];
        await prisma.itemCatalogo.update({
          where: { id: principal.id },
          data: { item: NOME_POLTRONA_CAICO, valor: 975.61, ativo: true }
        });
        for (let i = 1; i < itensCatADefinir.length; i++) {
          await prisma.itemCatalogo.delete({ where: { id: itensCatADefinir[i].id } });
        }
      }

      const itensDfdADefinir = await prisma.itemDfd.findMany({
        where: {
          categoriaId: catMobilia.id,
          OR: [
            { itemCatalogoNome: { equals: "A definir", mode: "insensitive" } },
            { itemNomeLivre: { equals: "A definir", mode: "insensitive" } }
          ]
        }
      });

      for (const idfd of itensDfdADefinir) {
        await prisma.itemDfd.update({
          where: { id: idfd.id },
          data: {
            itemCatalogoNome: NOME_POLTRONA_CAICO,
            ...(idfd.itemNomeLivre ? { itemNomeLivre: NOME_POLTRONA_CAICO } : {})
          }
        });
      }
      console.log(`  - Mobília ("A definir" -> "${NOME_POLTRONA_CAICO}"): ${itensDfdADefinir.length} DFD(s) atualizado(s).`);
    }

    // 1.2 Informática: Laboratório educacional móvel com 40 Chromebooks (10 un x R$ 120.000,00 no DFD e R$ 120.000,00 no Catálogo)
    const itensCatChromebook = await prisma.itemCatalogo.findMany({
      where: {
        item: { contains: "40 Chromebooks", mode: "insensitive" }
      }
    });
    if (itensCatChromebook.length > 0) {
      await prisma.itemCatalogo.update({
        where: { id: itensCatChromebook[0].id },
        data: {
          item: NOME_LAB_CHROMEBOOKS,
          valor: 120000,
          ativo: true
        }
      });
      for (let i = 1; i < itensCatChromebook.length; i++) {
        await prisma.itemCatalogo.delete({ where: { id: itensCatChromebook[i].id } });
      }
    }

    const itensDfdChromebook = await prisma.itemDfd.findMany({
      where: {
        OR: [
          { itemCatalogoNome: { contains: "40 Chromebooks", mode: "insensitive" } },
          { itemNomeLivre: { contains: "40 Chromebooks", mode: "insensitive" } }
        ]
      }
    });
    for (const idfd of itensDfdChromebook) {
      await prisma.itemDfd.update({
        where: { id: idfd.id },
        data: {
          itemCatalogoNome: NOME_LAB_CHROMEBOOKS,
          ...(idfd.itemNomeLivre ? { itemNomeLivre: NOME_LAB_CHROMEBOOKS } : {}),
          quantidade: 10,
          valorUnit: 120000,
          valorTotal: 1200000
        }
      });
    }
    console.log(`  - Chromebooks STI (10 un x R$ 120.000,00): ${itensDfdChromebook.length} item(ns) de DFD e catálogo atualizados.`);

    // 1.3 Informática: Datacenter (R$ 4.000.000,00) -> preservar no DFD como item livre e excluir do Catálogo
    const itensDfdDatacenter = await prisma.itemDfd.findMany({
      where: {
        OR: [
          { itemCatalogoNome: { contains: "Datacenter institucional", mode: "insensitive" } },
          { itemNomeLivre: { contains: "Datacenter institucional", mode: "insensitive" } }
        ]
      }
    });
    for (const idfd of itensDfdDatacenter) {
      await prisma.itemDfd.update({
        where: { id: idfd.id },
        data: {
          itemNomeLivre: idfd.itemNomeLivre || idfd.itemCatalogoNome || NOME_DATACENTER,
          itemCatalogoNome: null
        }
      });
    }
    const delDatacenter = await prisma.itemCatalogo.deleteMany({
      where: { item: { contains: "Datacenter institucional", mode: "insensitive" } }
    });
    console.log(`  - Datacenter STI: removido do catálogo (${delDatacenter.count}) e preservado no DFD (${itensDfdDatacenter.length}).`);

    // 1.4 Acervo Bibliográfico e Aquisição Veículos -> preservar texto em itemNomeLivre nos DFDs e limpar ItemCatalogo
    for (const nomeCatSemCatalogo of ["Acervo Bibliográfico", "Aquisição Veículos"]) {
      const cat = await prisma.categoria.findFirst({ where: { nome: nomeCatSemCatalogo } });
      if (!cat) continue;

      const dfdItens = await prisma.itemDfd.findMany({ where: { categoriaId: cat.id } });
      for (const idfd of dfdItens) {
        if (!idfd.itemNomeLivre && idfd.itemCatalogoNome) {
          await prisma.itemDfd.update({
            where: { id: idfd.id },
            data: {
              itemNomeLivre: idfd.itemCatalogoNome,
              itemCatalogoNome: null
            }
          });
        } else if (idfd.itemCatalogoNome) {
          await prisma.itemDfd.update({
            where: { id: idfd.id },
            data: { itemCatalogoNome: null }
          });
        }
      }

      const delCat = await prisma.itemCatalogo.deleteMany({ where: { categoriaId: cat.id } });
      if (nomeCatSemCatalogo === "Acervo Bibliográfico") {
        await prisma.categoria.update({
          where: { id: cat.id },
          data: { semItem: true, tipoBemPadrao: "PERMANENTE" }
        });
      }
      console.log(`  - ${nomeCatSemCatalogo}: ${delCat.count} registro(s) removido(s) do catálogo (${dfdItens.length} itens de DFD preservados).`);
    }

    // -------------------------------------------------------------------------
    // 2. LIMPEZA DE SIGLAS COMPOSTAS (LAB CONSUMO -, LAB EQUIP -, ELET , - MOB -)
    //    E RECLASSIFICAÇÃO DO ITEM "LAB CONSUMO - FITA DUPLA FACE..." QUE CAIU EM EXPEDIENTE
    // -------------------------------------------------------------------------
    console.log("\n[2/5] Limpando siglas compostas (LAB CONSUMO, LAB EQUIP, ELET, MOB) nos DFDs...");

    const catLabCons = await prisma.categoria.findFirst({ where: { nome: "Laboratório Consumo" } });
    const catExpediente = await prisma.categoria.findFirst({ where: { nome: "Material de expediente e de uso didático" } });

    if (catLabCons && catExpediente) {
      // Mover "LAB CONSUMO - FITA DUPLA FACE..." de Expediente para Laboratório Consumo
      const fitaEmExp = await prisma.itemCatalogo.findMany({
        where: {
          categoriaId: catExpediente.id,
          item: { startsWith: "LAB CONSUMO", mode: "insensitive" }
        }
      });
      for (const f of fitaEmExp) {
        await prisma.itemCatalogo.delete({ where: { id: f.id } });
      }

      const fitaDfdEmExp = await prisma.itemDfd.findMany({
        where: {
          categoriaId: catExpediente.id,
          OR: [
            { itemCatalogoNome: { startsWith: "LAB CONSUMO", mode: "insensitive" } },
            { itemNomeLivre: { startsWith: "LAB CONSUMO", mode: "insensitive" } }
          ]
        }
      });
      for (const idfd of fitaDfdEmExp) {
        const limpo = limparNomeCatalogo(idfd.itemCatalogoNome || idfd.itemNomeLivre);
        await prisma.itemDfd.update({
          where: { id: idfd.id },
          data: {
            categoriaId: catLabCons.id,
            itemCatalogoNome: limpo,
            ...(idfd.itemNomeLivre ? { itemNomeLivre: limpo } : {})
          }
        });
      }
    }

    // Limpar siglas em todos os ItemDfd que tenham LAB CONSUMO, LAB EQUIP, ELET, MOB, INFO, AV, CLIM
    const todosItensDfd = await prisma.itemDfd.findMany({
      select: { id: true, itemCatalogoNome: true, itemNomeLivre: true }
    });

    const dfdsParaLimpar = [];
    for (const idfd of todosItensDfd) {
      const catNomeAtual = idfd.itemCatalogoNome;
      const livreAtual = idfd.itemNomeLivre;
      let novoCatNome = catNomeAtual;
      let novoLivre = livreAtual;

      if (
        catNomeAtual &&
        (SIGLA_REGEX.test(catNomeAtual.trim()) ||
          /\s+-\s+(MOB|INFO|ELET|AV|CLIM|LAB\s+EQUIP|LAB\s+CONSUMO)\s+-\s+/i.test(catNomeAtual) ||
          catNomeAtual.startsWith('"') ||
          catNomeAtual.includes("\n"))
      ) {
        novoCatNome = limparNomeCatalogo(catNomeAtual);
      }

      if (
        livreAtual &&
        (SIGLA_REGEX.test(livreAtual.trim()) ||
          /\s+-\s+(MOB|INFO|ELET|AV|CLIM|LAB\s+EQUIP|LAB\s+CONSUMO)\s+-\s+/i.test(livreAtual) ||
          livreAtual.startsWith('"'))
      ) {
        novoLivre = limparNomeCatalogo(livreAtual);
      }

      if (novoCatNome !== catNomeAtual || novoLivre !== livreAtual) {
        dfdsParaLimpar.push({ id: idfd.id, itemCatalogoNome: novoCatNome, itemNomeLivre: novoLivre });
      }
    }

    await executarEmLotes(dfdsParaLimpar, 25, async (u) => {
      await prisma.itemDfd.update({
        where: { id: u.id },
        data: {
          itemCatalogoNome: u.itemCatalogoNome,
          itemNomeLivre: u.itemNomeLivre
        }
      });
    });
    console.log(`  - ${dfdsParaLimpar.length} itens de DFD tiveram siglas/quebras limpas.`);

    // -------------------------------------------------------------------------
    // 3. UNIFICAR OS 4 PARES DE CATEGORIAS (TRANSPOSIÇÃO -> CATEGORIA ORIGINAL)
    //    E ELIMINAR DUPLICATAS PRESERVANDO O VALOR MAIS FIDEDIGNO
    // -------------------------------------------------------------------------
    console.log("\n[3/5] Unificando categorias da transposição às categorias originais e deduplicando catálogo...");

    const PARES_UNIFICACAO = [
      {
        origem: "Materiais Permanentes e Equipamentos Odontológicos e Laboratorial",
        destino: "Laboratório Equipamentos"
      },
      {
        origem: "Materiais de Consumo Odontológico e Laboratorial",
        destino: "Laboratório Consumo"
      },
      {
        origem: "Audio e vídeo - equipamentos",
        destino: "Áudio e Vídeo - equipamentos e materiais"
      },
      {
        origem: "Informática -Equipamentos",
        destino: "Informática - equipamentos"
      }
    ];

    for (const par of PARES_UNIFICACAO) {
      const catOrigem = await prisma.categoria.findFirst({ where: { nome: par.origem } });
      const catDestino = await prisma.categoria.findFirst({ where: { nome: par.destino } });

      if (!catOrigem && !catDestino) continue;

      if (catOrigem && !catDestino) {
        // Apenas renomear catOrigem para catDestino
        await prisma.categoria.update({
          where: { id: catOrigem.id },
          data: { nome: par.destino }
        });
        console.log(`  - Categoria "${par.origem}" renomeada para "${par.destino}".`);
        continue;
      }

      if (catOrigem && catDestino) {
        // 3.1 Preservar metadados (codigoPcaPadrao, setorTecnicoId, classificacaoRubrica, tipoBemPadrao) na categoria destino
        await prisma.categoria.update({
          where: { id: catDestino.id },
          data: {
            codigoPcaPadrao: catDestino.codigoPcaPadrao || catOrigem.codigoPcaPadrao,
            setorTecnicoId: catDestino.setorTecnicoId || catOrigem.setorTecnicoId,
            classificacaoRubrica: catOrigRubricaPreferida(catDestino.classificacaoRubrica, catOrigem.classificacaoRubrica),
            tipoBemPadrao: catDestino.tipoBemPadrao || catOrigem.tipoBemPadrao
          }
        });

        // 3.2 Carregar todos os itens de catálogo das duas categorias
        const itensDest = await prisma.itemCatalogo.findMany({ where: { categoriaId: catDestino.id } });
        const itensOrig = await prisma.itemCatalogo.findMany({ where: { categoriaId: catOrigem.id } });
        const todosItens = [...itensDest, ...itensOrig];

        // Agrupar itens equivalentes
        const grupos = [];
        for (const it of todosItens) {
          const nomeLimpo = limparNomeCatalogo(it.item);
          const k = normKey(nomeLimpo);

          let grupoExistente = grupos.find((g) => saoMesmoItemCatalogo(par.destino, g.key, k, g.nomeCanonica, nomeLimpo, g.valores));
          if (!grupoExistente) {
            grupoExistente = {
              key: k,
              nomeCanonica: escolherMelhorNome(it.item, nomeLimpo),
              itens: [],
              valores: []
            };
            grupos.push(grupoExistente);
          } else {
            grupoExistente.nomeCanonica = escolherMelhorNome(grupoExistente.nomeCanonica, nomeLimpo);
          }
          grupoExistente.itens.push(it);
          grupoExistente.valores.push(Number(it.valor));
        }

        const idsParaDeletar = [];
        // Primeiro coletar e deletar todas as cópias excedentes de cada grupo (deixando apenas 1 registro por grupo)
        for (const g of grupos) {
          // Escolher o registro principal (preferir o que já está em catDestino)
          const principal = g.itens.find((x) => x.categoriaId === catDestino.id) || g.itens[0];
          const valorFidedigno = escolherValorFidedigno(g.key, g.itens, mapaPlanilha);
          g.principal = principal;
          g.valorFidedigno = valorFidedigno;

          for (const it of g.itens) {
            if (it.id !== principal.id) {
              idsParaDeletar.push(it.id);
            }
          }
        }

        if (idsParaDeletar.length > 0) {
          await prisma.itemCatalogo.deleteMany({ where: { id: { in: idsParaDeletar } } });
        }
        const duplicatasRemovidas = idsParaDeletar.length;

        // Depois atualizar apenas os registros principais que mudaram de categoria, nome ou valor, em lotes paralelos
        const gruposParaAtualizar = grupos.filter(
          (g) =>
            g.principal.categoriaId !== catDestino.id ||
            g.principal.item !== g.nomeCanonica ||
            Math.abs(Number(g.principal.valor) - g.valorFidedigno) > 0.005
        );
        await executarEmLotes(gruposParaAtualizar, 20, async (g) => {
          await atualizarItemCatalogoSeguro(prisma, g.principal.id, catDestino.id, g.nomeCanonica, g.valorFidedigno);
        });

        // 3.3 Re-vincular todos os ItemDfd, ItemTecnico, ConsolidacaoTecnica, etc. de catOrigem para catDestino
        await prisma.itemDfd.updateMany({
          where: { categoriaId: catOrigem.id },
          data: { categoriaId: catDestino.id }
        });
        await prisma.itemTecnico.updateMany({
          where: { categoriaId: catOrigem.id },
          data: { categoriaId: catDestino.id }
        });

        // Para ConsolidacaoTecnica, tem unique([pcaAno, categoriaId]) quando consolidarPorObjeto=false; verificar antes de mover
        const consOrig = await prisma.consolidacaoTecnica.findMany({ where: { categoriaId: catOrigem.id } });
        for (const co of consOrig) {
          const consDest = await prisma.consolidacaoTecnica.findFirst({
            where: { pcaAno: co.pcaAno, categoriaId: catDestino.id }
          });
          if (!consDest) {
            await prisma.consolidacaoTecnica.update({
              where: { id: co.id },
              data: { categoriaId: catDestino.id }
            });
          } else {
            await prisma.itemDfd.updateMany({
              where: { consolidacaoTecnicaId: co.id },
              data: { consolidacaoTecnicaId: consDest.id }
            });
            await prisma.itemTecnico.updateMany({
              where: { consolidacaoTecnicaId: co.id },
              data: { consolidacaoTecnicaId: consDest.id }
            });
            await prisma.consolidacaoTecnica.delete({ where: { id: co.id } });
          }
        }

        await prisma.entrega.updateMany({
          where: { categoriaId: catOrigem.id },
          data: { categoriaId: catDestino.id }
        });
        await prisma.trocaOP.updateMany({
          where: { categoriaId: catOrigem.id },
          data: { categoriaId: catDestino.id }
        });
        await prisma.solicitacaoCatalogo.updateMany({
          where: { categoriaId: catOrigem.id },
          data: { categoriaId: catDestino.id }
        });
        await prisma.solicitacaoAutorizacaoCotaGeral.updateMany({
          where: { categoriaId: catOrigem.id },
          data: { categoriaId: catDestino.id }
        });

        // 3.4 Excluir a categoria redundante da transposição
        await prisma.categoria.delete({ where: { id: catOrigem.id } });
        console.log(
          `  - Unificada "${par.origem}" -> "${par.destino}": ${duplicatasRemovidas} duplicatas eliminadas, ${grupos.length} itens únicos preservados.`
        );
      }
    }

    // -------------------------------------------------------------------------
    // 4. DEDUPLICAÇÃO INTERNA E LIMPEZA DE SIGLAS NAS DEMAIS CATEGORIAS
    //    (Climatização, Eletrodomésticos, Mobília, Laboratório Consumo, etc.)
    // -------------------------------------------------------------------------
    console.log("\n[4/5] Limpando duplicatas internas em Climatização, Eletrodomésticos e Mobília...");

    // 4.1 Climatização: remover duplicatas 36 MIL BTUS e 48 MIL BTUS, padronizar 18, 24 e 80 MIL BTUS Inverter e Climatizador Portátil
    const catClim = await prisma.categoria.findFirst({ where: { nome: "Climatização" } });
    if (catClim) {
      // Excluir as 2 duplicatas legadas com preço dividido por 1000
      await prisma.itemCatalogo.deleteMany({
        where: {
          categoriaId: catClim.id,
          item: { in: ["Ar-condicionado cassete 36 MIL BTUS", "Ar-condicionado piso-teto 48 MIL BTUS"] }
        }
      });

      const padronizacoesClim = [
        {
          antigo: "Ar-condicionado cassete 18 MIL BTUS",
          novo: "Ar-condicionado Split Cassete 18.000 BTUs Inverter",
          valor: 6490.00
        },
        {
          antigo: "Ar-condicionado cassete 24 MIL BTUS",
          novo: "Ar-condicionado Split Cassete 24.000 BTUs Inverter",
          valor: 6590.00
        },
        {
          antigo: "Ar-condicionado piso-teto 80 MIL BTUS",
          novo: "Ar-condicionado Split Piso-Teto 80.000 BTUs Inverter",
          valor: 13430.00
        }
      ];

      for (const pClim of padronizacoesClim) {
        const jaExisteNovo = await prisma.itemCatalogo.findFirst({
          where: { categoriaId: catClim.id, item: pClim.novo }
        });
        const itemAntigo = await prisma.itemCatalogo.findFirst({
          where: { categoriaId: catClim.id, item: pClim.antigo }
        });
        if (itemAntigo) {
          if (jaExisteNovo) {
            await prisma.itemCatalogo.update({
              where: { id: jaExisteNovo.id },
              data: { valor: pClim.valor }
            });
            await prisma.itemCatalogo.delete({ where: { id: itemAntigo.id } });
          } else {
            await prisma.itemCatalogo.update({
              where: { id: itemAntigo.id },
              data: { item: pClim.novo, valor: pClim.valor }
            });
          }
        }
      }
    }

    // 4.2 Limpar siglas, quebras de linha e duplicatas internas em TODAS as categorias restantes
    const todasCategorias = await prisma.categoria.findMany();
    let totalDupInternas = 0;

    for (const cat of todasCategorias) {
      const itensCat = await prisma.itemCatalogo.findMany({ where: { categoriaId: cat.id } });
      if (itensCat.length === 0) continue;

      const gruposCat = [];
      for (const it of itensCat) {
        const nomeLimpo = limparNomeCatalogo(it.item);
        const k = normKey(nomeLimpo);
        let g = gruposCat.find((x) => saoMesmoItemCatalogo(cat.nome, x.key, k, x.nomeCanonica, nomeLimpo, x.valores));
        if (!g) {
          g = {
            key: k,
            nomeCanonica: escolherMelhorNome(it.item, nomeLimpo),
            itens: [],
            valores: []
          };
          gruposCat.push(g);
        } else {
          g.nomeCanonica = escolherMelhorNome(g.nomeCanonica, nomeLimpo);
        }
        g.itens.push(it);
        g.valores.push(Number(it.valor));
      }

      const idsDupCat = [];
      for (const g of gruposCat) {
        const principal = g.itens[0];
        const valorFidedigno = escolherValorFidedigno(g.key, g.itens, mapaPlanilha);
        g.principal = principal;
        g.valorFidedigno = valorFidedigno;

        for (let i = 1; i < g.itens.length; i++) {
          idsDupCat.push(g.itens[i].id);
          totalDupInternas++;
        }
      }

      if (idsDupCat.length > 0) {
        await prisma.itemCatalogo.deleteMany({ where: { id: { in: idsDupCat } } });
      }

      const gruposCatParaAtualizar = gruposCat.filter(
        (g) => g.principal.item !== g.nomeCanonica || Math.abs(Number(g.principal.valor) - g.valorFidedigno) > 0.005
      );
      await executarEmLotes(gruposCatParaAtualizar, 20, async (g) => {
        await atualizarItemCatalogoSeguro(prisma, g.principal.id, cat.id, g.nomeCanonica, g.valorFidedigno);
      });
    }
    console.log(`  - Duplicatas internas adicionais eliminadas: ${totalDupInternas}.`);

    // -------------------------------------------------------------------------
    // 5. RESTAURAÇÃO EXPLÍCITA DE TODOS OS PREÇOS DIVIDIDOS POR 1.000 (TABELA 3.1)
    //    E CENTAVOS ARREDONDADOS (TABELA 3.2)
    // -------------------------------------------------------------------------
    console.log("\n[5/5] Garantindo restauração de 100% dos preços divididos por 1.000 (Tabela 3.1)...");

    const PRECOS_TABELA_3_1 = [
      { termo: "Geladeira para copa com mínimo de 360 litros", valor: 2730.00 },
      { termo: "Freezer para laboratório 140 litros", valor: 2600.00 },
      { termo: "Bebedouro para corredor (02 torneiras)", valor: 1710.00 },
      { termo: "Bebedouro para corredor (03 torneiras)", valor: 2213.00 },
      { termo: "BANHO MARIA Termostático Digital Microprocessado 10 litros", valor: 2880.00 },
      { termo: "Balança Médica Antropométrica Mecânica", valor: 1750.00 },
      { termo: "Barras Paralelas para Fisioterapia", valor: 1480.00 },
      { termo: "ESTUFA LABORATÓRIO. Estufa de Cultura Bacteriológica", valor: 2210.00 },
      { termo: "Espectrofotômetro Digital. Display lcd", valor: 4920.00 },
      { termo: "Câmera filmadora para uso profissional ou práticas de cursos da área de comunicação (ref. SONY", valor: 27990.00 },
      { termo: "Câmera fotográfica para uso profissional ou práticas de cursos da área de comunicação", valor: 8010.00 },
      { termo: "Gravador Para Podcasts 8 Canais", valor: 3740.00 },
      { termo: "Tripé Profissional para Teleprompter", valor: 1830.00 },
      { termo: "Nobreak 3000va tipo 03 (suporte para equipamento de grande porte)", valor: 1700.00 },
      { termo: "Mapoteca em aço com 5 gavetas", valor: 6487.50 },
      { termo: "Armário vitrine para armazenar vidrarias - laboratório", valor: 2590.00 },
      { termo: "Poltrona para auditório adaptada para pessoa obesa", valor: 2277.00 },
      { termo: "Armário guarda-volume para vestiário ou organização administrativa (20 portas)", valor: 1349.90 },
      { termo: "Carro para auxilio em serviços de transporte interno com capacidade para 400kg", valor: 1340.27 },
      { termo: "Expositor de livtros com 5 prateleiras", valor: 1187.50 },
      { termo: "Sofá de dois lugares para ambiente de recepção", valor: 1149.00 },
      { termo: "Sofá de três lugares para ambiente de recepção", valor: 1005.00 },
      { termo: "Púlpito/Tribuna em acrílico para auditório", valor: 1000.00 },
      { termo: "Climatizador Tipo: Portátil", valor: 1100.00 },
      { termo: "Colposcópio – AUMENTO/CÂMERA/MONITOR", valor: 22357.00 },
      { termo: "Cadeira de Rodas para Obeso - CAPACIDADE/BRAÇOS/PÉS: DE 130 KG A 159 KG", valor: 1337.00 },
      { termo: "Máquina Plastificadora - Abertura para inserção = 330", valor: 1255.56 }
    ];

    let precosRestaurados = 0;
    for (const p of PRECOS_TABELA_3_1) {
      const res = await prisma.itemCatalogo.updateMany({
        where: {
          item: { startsWith: p.termo, mode: "insensitive" },
          valor: { lt: 100 }
        },
        data: { valor: p.valor }
      });
      precosRestaurados += res.count;
    }
    console.log(`  - ${precosRestaurados} preços que ainda estavam < R$ 100 foram restaurados diretamente pela Tabela 3.1.`);

    console.log("\n=== SANEAMENTO DEFINITIVO DO CATÁLOGO CONCLUÍDO COM SUCESSO! ===");
  } finally {
    if (!prismaClient) {
      await prisma.$disconnect();
    }
  }
}

function catOrigRubricaPreferida(rubDest, rubOrig) {
  if (rubOrig && rubOrig.length > (rubDest || "").length) return rubOrig;
  return rubDest || rubOrig || null;
}

function escolherMelhorNome(nomeA, nomeB) {
  const limpoA = limparNomeCatalogo(nomeA);
  const limpoB = limparNomeCatalogo(nomeB);
  // Se um dos nomes teve texto colado duas vezes na planilha (ex: "FIO DE SUTURA ... - FIO DE SUTURA ..."), preferir o mais curto/limpo do catálogo original
  if (limpoA.length > 40 && limpoB.length > 40) {
    const p25A = normKey(limpoA).slice(0, 25);
    const p25B = normKey(limpoB).slice(0, 25);
    if (p25A === p25B) {
      return limpoA.length <= limpoB.length ? limpoA : limpoB;
    }
  }
  return limpoB;
}

function saoMesmoItemCatalogo(catNome, keyA, keyB, nomeA, nomeB, valoresGrupo) {
  if (keyA === keyB) return true;

  // Caso 1: "Cadeira p/ Secretária pé palito L duplo, Tecido Azul - MOB - Cadeira tipo Secretária" vs "Cadeira tipo Secretária"
  if (
    catNome === "Mobília" &&
    ((nomeA.includes("Cadeira tipo Secretária") && nomeB === "Cadeira tipo Secretária") ||
      (nomeB.includes("Cadeira tipo Secretária") && nomeA === "Cadeira tipo Secretária"))
  ) {
    return true;
  }

  // Caso 2: Áudio e Vídeo:
  // - Caixa de som para auditório (diferença apenas de ";" entre duas vias e Potência RMS)
  // - Iluminador para filmagem profissional GODOX/ LDX50BI (com e sem "led 50W")
  if (catNome.includes("Áudio e Vídeo") || catNome.includes("Audio e vídeo")) {
    if (keyA.slice(0, 45) === keyB.slice(0, 45) && keyA.startsWith("caixa de som para auditório")) return true;
    if (keyA.includes("godox ldx50bi") && keyB.includes("godox ldx50bi")) return true;
  }

  // Caso 3: Informática:
  // - Computador Tipo 01 (SEM MONITOR) para uso comum vs Computador Tipo 01 para uso comum ... SEM MONITOR
  // - Computador Tipo 02 (SEM MONITOR) para alto processamento vs Computador Tipo 02 para alto processamento ... vs Computador para alto processamento ...
  if (catNome.includes("Informática")) {
    if (
      keyA.includes("computador tipo 01") &&
      keyB.includes("computador tipo 01") &&
      keyA.includes("sem monitor") &&
      keyB.includes("sem monitor")
    ) {
      return true;
    }
    if (
      keyA.includes("alto processamento gráfico e dados") &&
      keyB.includes("alto processamento gráfico e dados") &&
      !keyA.includes("completo incluindo monitor") &&
      !keyB.includes("completo incluindo monitor") &&
      valoresGrupo.some((v) => v > 10000)
    ) {
      return true;
    }
  }

  // Caso 4: Laboratório Equipamentos (os 4 itens LAB EQUIP com pequena variação de espaço ou 1 palavra: Armário de alumínio, BRAÇADEIRA PARA INJEÇÃO, Escada dobrável, Imobilizador de Cabeça)
  if (catNome === "Laboratório Equipamentos") {
    if (keyA.startsWith("armário de alumínio para armazenar vidrarias") && keyB.startsWith("armário de alumínio para armazenar vidrarias")) return true;
    if (keyA.startsWith("braçadeira para injeção") && keyB.startsWith("braçadeira para injeção")) return true;
    if (keyA.startsWith("escada dobrável especificações mínimas em alumínio") && keyB.startsWith("escada dobrável especificações mínimas em alumínio")) return true;
    if (keyA.startsWith("imobilizador de cabeça com blocos laterais") && keyB.startsWith("imobilizador de cabeça com blocos laterais")) return true;
  }

  // Caso 5: Laboratório Consumo (itens onde na planilha o nome foi colado duas vezes ou teve 1 letra diferente: APLICADOR REGULAR extra fino, CONDICIONADOR ÁCIDO FOSFÓRICO 35%, FIO DE SUTURA ABSORVÍVEL POLIGLACTINA 910 TIPO FIO 4 0, FORMOCRESOL, LIDOCAÍNA CLORIDRATO ... FENILEFRINA, PINO PRÉ FABRICADO CÔNICO, RESINA COMPOSTA PARA RESTAURAÇÃO DENTÁRIA ... 49, ÁLCOOL ETÍLICO ANIDR0 ABSOLUTO, FITA DUPLA FACE DE FIXAÇÃO EXTREMA)
  if (catNome === "Laboratório Consumo") {
    if (keyA.startsWith("condicionador ácido fosfórico 35") && keyB.startsWith("condicionador ácido fosfórico 35")) return true;
    if (keyA.startsWith("fio de sutura absorvível poliglactina 910 tipo fio 4 0") && keyB.startsWith("fio de sutura absorvível poliglactina 910 tipo fio 4 0")) return true;
    if (keyA.includes("formocresol composição formaldeído") && keyB.includes("formocresol composição formaldeído")) return true;
    if (keyA.startsWith("lidocaína cloridrato composição associada com fenilefrina") && keyB.startsWith("lidocaína cloridrato composição associada com fenilefrina")) return true;
    if (keyA.startsWith("pino pré fabricado cônico") && keyB.startsWith("pino pré fabricado cônico")) return true;
    if (keyA.startsWith("álcool etílico anidr0 absoluto") && keyB.startsWith("álcool etílico anidr0 absoluto")) return true;
    if (keyA.startsWith("fita dupla face de fixação extrema") && keyB.startsWith("fita dupla face de fixação extrema")) return true;
    if (
      keyA.startsWith("aplicador regular possui haste dobrável") &&
      keyB.startsWith("aplicador regular possui haste dobrável") &&
      keyA.includes("extra fino") &&
      keyB.includes("extra fino")
    ) {
      return true;
    }
  }

  return false;
}

function escolherValorFidedigno(key, itensGrupo, mapaPlanilha) {
  const valores = itensGrupo.map((x) => Number(x.valor)).filter((v) => v > 0);
  const maxVal = Math.max(...valores);
  const minVal = Math.min(...valores);

  // 1. Se houver valor na planilha oficial PCA 2027 para essa chave:
  const valsPlan = mapaPlanilha.get(key);
  if (valsPlan && valsPlan.length > 0) {
    // Se algum valor da planilha for >= maxVal * 0.9, usar o valor exato da planilha (com centavos)
    const valPlanFidedigno = Math.max(...valsPlan);
    if (valPlanFidedigno >= maxVal * 0.8) {
      return valPlanFidedigno;
    }
  }

  // 2. Se um dos itens do grupo sofreu o bug de divisão por 1000 (ex: 2.73 vs 2730, 1.34 vs 1337, 22.36 vs 22357):
  if (maxVal > minVal * 100) {
    // Preferir entre os valores altos aquele que possui casas decimais exatas (se houver)
    const altos = valores.filter((v) => v >= maxVal * 0.8);
    const comCentavos = altos.find((v) => v % 1 !== 0);
    return comCentavos !== undefined ? comCentavos : maxVal;
  }

  // 3. Se os valores são próximos (ex: 412 vs 412.37, 1013 vs 1012.81), preferir o que tem centavos exatos
  const comCentavos = valores.find((v) => v % 1 !== 0);
  if (comCentavos !== undefined && Math.abs(comCentavos - maxVal) <= 5) {
    return comCentavos;
  }

  return maxVal;
}

if (process.argv[1] && process.argv[1].includes("sanear-catalogo-definitivo")) {
  sanearCatalogoDefinitivo()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

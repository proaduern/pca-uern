import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

function gerarId(prefix = "pca27") {
  return `${prefix}_${crypto.randomBytes(10).toString("hex")}`;
}

const UNIDADES_OFICIAIS_UERN = [
  { nome: "Campus Assu", email: "assu@uern.br", elegivelCotaOP: true, cotaOP: 153093.20 },
  { nome: "Campus Caicó", email: "caico@uern.br", elegivelCotaOP: true, cotaOP: 167389.28 },
  { nome: "Campus Natal", email: "natal@uern.br", elegivelCotaOP: true, cotaOP: 181216.71 },
  { nome: "Campus Patu", email: "patu@uern.br", elegivelCotaOP: true, cotaOP: 151307.72 },
  { nome: "Campus Pau dos Ferros", email: "cpdf@uern.br", elegivelCotaOP: true, cotaOP: 247078.68 },
  { nome: "FACIS - Faculdade de Ciências da Saúde", email: "facis@uern.br", elegivelCotaOP: true, cotaOP: 211026.06 },
  { nome: "FAEF - Faculdade de Educação Física", email: "faef@uern.br", elegivelCotaOP: true, cotaOP: 147736.76 },
  { nome: "FAEN - Faculdade de Enfermagem", email: "faen@uern.br", elegivelCotaOP: true, cotaOP: 157111.49 },
  { nome: "FACS - Faculdade de Ciências Sociais Aplicadas", email: "facs@uern.br", elegivelCotaOP: true, cotaOP: 151307.72 },
  { nome: "FANAT - Faculdade de Ciências Exatas e Naturais", email: "fanat@uern.br", elegivelCotaOP: true, cotaOP: 205669.60 },
  { nome: "FASSO - Faculdade de Serviço Social", email: "fasso@uern.br", elegivelCotaOP: true, cotaOP: 135238.38 },
  { nome: "FAED - Faculdade de Educação", email: "faed@uern.br", elegivelCotaOP: true, cotaOP: 137023.86 },
  { nome: "FALA - Faculdade de Letras e Artes", email: "fala@uern.br", elegivelCotaOP: true, cotaOP: 140594.82 },
  { nome: "FMD - Faculdade de Medicina", email: "fmd@uern.br", elegivelCotaOP: true, cotaOP: 216382.52 },
  { nome: "Comitê Especializado - Saúde e Laboratórios", email: "cesl@uern.br", elegivelCotaOP: true, cotaOP: 2694119.28 },
  { nome: "PROAD", email: "adj.proad@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Almoxarifado - PROAD", email: "almoxarifado@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Patrimônio - PROAD", email: "patrimonio@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Dir. Administração e Serviços - PROAD", email: "diradm@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Transportes - PROAD", email: "transportes@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "SOBE", email: "sobe@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "STI", email: "sti@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "DSIB", email: "biblioteca@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Comitê Especializado - Eventos e Com. Visual", email: "ceeicv@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Comitê Especializado - Esportes e Lazer", email: "ceel@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Comitê Especializado - Fotografia, Audio e Vídeo", email: "cefav@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Setor de Diárias, Passagens e Hospedagens – PROAD", email: "diarias.proad@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Gabinete da Reitoria", email: "gr@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Gabinete do Vice-Reitor", email: "gvr@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "PRAE", email: "prae@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "PROEG", email: "proeg@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "PROEX", email: "proex@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "PROPEG", email: "propeg@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "PROGEP", email: "progep@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "PROPLAN", email: "proplan@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "DIPRE", email: "dipre@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "DLC", email: "dlc@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "AGECOM", email: "agecom@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Edições UERN", email: "edicoes.uern@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "CERES", email: "ceres@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "DEAD", email: "dead@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "DAIN", email: "dain@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "DARA", email: "dara@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "DINFRA", email: "dinfra@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "DCONT", email: "dcont@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "DFIN", email: "dfin@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Ouvidoria", email: "ouvidoria@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Secretaria dos Conselhos", email: "secon@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Assessoria Jurídica", email: "asjur@uern.br", elegivelCotaOP: false, cotaOP: 0 },
  { nome: "Comissão Rádio e TV", email: "comissao.radiotv@uern.br", elegivelCotaOP: false, cotaOP: 0 },
];

const SETORES_TECNICOS_DEFINICAO = [
  { sigla: "DAS", nome: "DAS - Diretoria de Administração e Serviços", unidadeEmail: "diradm@uern.br" },
  { sigla: "DT", nome: "Setor de Transportes", unidadeEmail: "transportes@uern.br" },
  { sigla: "ALMOXARIFADO", nome: "Almoxarifado Central", unidadeEmail: "almoxarifado@uern.br" },
  { sigla: "PATRIMÔNIO", nome: "Setor de Patrimônio", unidadeEmail: "patrimonio@uern.br" },
  { sigla: "STI", nome: "STI - Superintendência de Tecnologia da Informação", unidadeEmail: "sti@uern.br" },
  { sigla: "SOBE", nome: "SOBE - Setor de Obras e Edificações", unidadeEmail: "sobe@uern.br" },
  { sigla: "CESL", nome: "Comitê Especializado - Saúde e Laboratórios", unidadeEmail: "cesl@uern.br" },
  { sigla: "CEECV", nome: "Comitê Especializado - Eventos e Com. Visual", unidadeEmail: "ceeicv@uern.br" },
  { sigla: "CEEL", nome: "Comitê Especializado - Esportes e Lazer", unidadeEmail: "ceel@uern.br" },
  { sigla: "CEFAV", nome: "Comitê Especializado - Fotografia, Audio e Vídeo", unidadeEmail: "cefav@uern.br" },
  { sigla: "DSIB", nome: "DSIB - Diretoria do Sistema Integrado de Bibliotecas", unidadeEmail: "biblioteca@uern.br" },
  { sigla: "PROAD", nome: "PROAD - Pró-Reitoria de Administração", unidadeEmail: "adj.proad@uern.br" },
  { sigla: "DIARIAS", nome: "Setor de Diárias, Passagens e Hospedagens – PROAD", unidadeEmail: "diarias.proad@uern.br" },
];

function truncarNomeCatalogo(espec) {
  const limpo = String(espec || "").trim();
  if (limpo.length <= 1200) return limpo;
  return limpo.slice(0, 1197) + "...";
}

function extrairPrioridade(texto) {
  if (!texto) return { nivel: "MEDIA", ordem: 2, frase: "Média" };
  const partes = String(texto).split(",");
  const bruto = partes[0].trim().toLowerCase();
  let nivel = "MEDIA";
  let ordem = 2;
  if (bruto.includes("altíssima") || bruto.includes("altissima")) {
    nivel = "ALTISSIMA";
    ordem = 4;
  } else if (bruto.includes("alta")) {
    nivel = "ALTA";
    ordem = 3;
  } else if (bruto.includes("baixa")) {
    nivel = "BAIXA";
    ordem = 1;
  }
  const frase = String(texto).trim().slice(0, 240) || "Média";
  return { nivel, ordem, frase };
}

function mapearEnquadramento(fonte) {
  const f = String(fonte || "").toUpperCase().trim();
  if (f.startsWith("OP")) return "OP";
  if (f.includes("CONVÊNIO") || f.includes("CONVENIO")) return "CONVENIO";
  if (f.includes("ARRECADAÇÃO") || f.includes("ARRECADACAO")) return "RECURSOS_EXTRA";
  return "GERAL";
}

function extrairConvenio(textoConvenio) {
  if (!textoConvenio) return { numero: null, ano: null };
  const m = String(textoConvenio).match(/(\d+)\s*\/\s*(\d{4})/);
  if (m) return { numero: String(textoConvenio).trim(), ano: Number(m[2]) };
  return { numero: String(textoConvenio).trim(), ano: 2027 };
}

function extrairRecursoExtra(fonte, convenioCol) {
  const combinado = `${fonte} ${convenioCol}`.trim();
  const mAg = combinado.match(/Ag[êe]ncia:\s*([^\n\r,;]+)/i);
  const mCc = combinado.match(/Conta:\s*([^\n\r,;]+)/i);
  return {
    agencia: mAg ? mAg[1].trim() : combinado.includes("POSEDUC") ? "POSEDUC" : combinado.includes("POSENSINO") ? "POSENSINO" : "PROPRIA",
    conta: mCc ? mCc[1].trim() : "ARRECADACAO-UNIDADE",
  };
}

/**
 * Regra deliberada pelo usuário para agrupamento de DFDs:
 * - MATERIAL: 100% mantido unificado por (Unidade + Categoria).
 * - SERVIÇO: Mantém agrupado APENAS as demandas 11, 16, 20 e 21 (FE / Campus Natal).
 *   Todas as demais demandas de serviço com múltiplos IDs SEI de DFD são desmembradas por ID SEI.
 */
function deveManterJunto(demandante, categoriaNome, tipo) {
  if (tipo === "MATERIAL") return true;
  
  const dNorm = String(demandante || "").trim().toLowerCase();
  const cNorm = String(categoriaNome || "").trim().toLowerCase();

  // Demanda 11: FE - Serviços de Fornecimento de Coffee break
  if (dNorm === "fe" && cNorm.includes("coffee break")) return true;

  // Demanda 16: Campus Natal - Serviços Gráficos
  if (dNorm === "campus natal" && cNorm === "serviços gráficos") return true;

  // Demanda 20: FE - Hospedagens
  if (dNorm === "fe" && cNorm === "hospedagens") return true;

  // Demanda 21: FE - Passagens Aéreas
  if (dNorm === "fe" && (cNorm === "passagens aéreas" || cNorm.includes("passagens"))) return true;

  return false;
}

const CATEGORIAS_ALVO_OBJETO = [
  'Obra ou Reforma',
  'Locação de imóvel',
  'Pagamento de Taxa / Associação',
  'Serviço de engenharia ou arquitetura',
  'Serviços de TI',
  'Serviços diversos para eventos'
];

function resumirObjeto(desc, catNome, unidadeOuSetor, sei) {
  if (sei === '44897642') {
    return 'Depósito de DOI - Identificador de Objeto Digital de Livros publicados';
  }
  if (!desc) return catNome;
  let limpo = desc.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();

  if (/curso\/setor\/atividade essencial pode parar/i.test(limpo)) {
    return 'Depósito de DOI - Identificador de Objeto Digital de Livros publicados';
  }
  if (/gestão compartilhada.*Centro Cultural/i.test(limpo)) {
    return 'Gestão compartilhada, administração e operacionalização técnico-cultural do novo Centro Cultural';
  }
  if (/Festival de Teatro.*FESTUERN/i.test(limpo)) {
    return 'Planejamento e produção executiva do 21º Festival de Teatro (FESTUERN)';
  }

  limpo = limpo
    .replace(/^contratação\s+((de|e)\s+)?(uma\s+)?(empresa|instituição|pessoa\s+jurídica)\s+(especializada\s+)?((em|para|na)\s+)?((na\s+)?prestação\s+de\s+serviços\s+(de|para|em)?)?\s*/i, '')
    .replace(/^contratação\s+((de|e)\s+)?(serviços?|soluções?|plataforma|ferramenta)\s+(especializados?|digitais?)?\s*(em|de|para)?\s*/i, '')
    .replace(/^contratação\s+((de|e)\s+)?/i, '')
    .replace(/^(na\s+)?prestação\s+de\s+serviços?\s+(de\s+|para\s+|em\s+)?/i, '')
    .replace(/^aquisição\s+(de\s+)?/i, '')
    .replace(/^(em|para|na)\s+/i, '')
    .trim();

  if (/^serviços?\s+(especializados?\s+)?(de|em|para)\s+/i.test(limpo)) {
    const semServico = limpo.replace(/^serviços?\s+(especializados?\s+)?(de|em|para)\s+/i, '').trim();
    if (semServico.length > 10) {
      limpo = semServico;
    }
  }

  if (limpo.length > 120) {
    const match = limpo.match(/(?<!\b(n|art|fl|av|sr|sra|prof|dr|dra|ed|v|cap))\.\s+([A-ZÀ-Ú])/);
    if (match && match.index > 25 && match.index < 120) {
      limpo = limpo.slice(0, match.index).trim();
    }
  }

  limpo = limpo.replace(/[\.;,\s]+$/, '').trim();
  limpo = limpo.charAt(0).toUpperCase() + limpo.slice(1);
  return limpo;
}

function formatarTitulo(objeto, sufixoSei, setorOuUnidade) {
  const seiPart = sufixoSei ? ` (${sufixoSei})` : '';
  const unidadePart = setorOuUnidade ? ` — ${setorOuUnidade}` : '';
  const maxObjetoLen = 200 - seiPart.length - unidadePart.length;
  let objResumido = objeto;
  if (objResumido.length > maxObjetoLen) {
    objResumido = objResumido.slice(0, maxObjetoLen - 3).trim() + '...';
  }
  return `${objResumido}${seiPart}${unidadePart}`;
}

export async function transporPca2027Oficial() {
  console.log("\n=======================================================");
  console.log("=== INICIANDO SINCRONIZAÇÃO E TRANSPOSIÇÃO DO PCA 2027 ===");
  console.log("=======================================================");

  const payloadFile = path.resolve(__dirname, "data/pca2027-preparado.json");
  if (!fs.existsSync(payloadFile)) {
    console.warn(`[PCA 2027] Arquivo de dados ${payloadFile} não encontrado. Pulando transposição.`);
    return;
  }

  const payload = JSON.parse(fs.readFileSync(payloadFile, "utf8"));
  console.log(`[PCA 2027] Carga do payload concluída (${payload.totais.totalGeralItens} itens preparados).`);

  // 1. Sincronizar Unidades Oficiais da UERN
  console.log("[PCA 2027] Sincronizando Unidades Oficiais da UERN...");
  const senhaHashPadrao = await bcrypt.hash("123", 10);
  for (const u of UNIDADES_OFICIAIS_UERN) {
    const existente = await prisma.unidade.findFirst({
      where: { OR: [{ email: u.email }, { nome: u.nome }] },
    });
    if (!existente) {
      await prisma.unidade.create({
        data: {
          nome: u.nome,
          email: u.email,
          senhaHash: senhaHashPadrao,
          senhaTemporaria: true,
          elegivelCotaOP: u.elegivelCotaOP,
          cotaOP: u.cotaOP,
          cotaGeral: 0,
          cotaTipo: u.elegivelCotaOP ? "FECHADA" : "ABERTA",
          verCotaGeralPCA: false,
          ativa: true,
        },
      });
      console.log(`[PCA 2027] Unidade criada: ${u.nome} (${u.email})`);
    } else {
      // Atualizar cotaOP oficial se necessário
      if (u.elegivelCotaOP && Number(existente.cotaOP) !== u.cotaOP) {
        await prisma.unidade.update({
          where: { id: existente.id },
          data: { cotaOP: u.cotaOP, elegivelCotaOP: true },
        });
      }
    }
  }

  const todasUnidadesDb = await prisma.unidade.findMany();
  const unidByEmail = new Map(todasUnidadesDb.map((u) => [u.email.toLowerCase(), u]));
  const unidByName = new Map(todasUnidadesDb.map((u) => [u.nome.toLowerCase().trim(), u]));

  // Aliases de demandantes da planilha
  const demandanteAliases = {
    "campus caicó \nprédios novos": "campus caicó",
    "campus caicó prédios novos": "campus caicó",
    "cesl": "comitê especializado - saúde e laboratórios",
    "ceel": "comitê especializado - esportes e lazer",
    "ceecv": "comitê especializado - eventos e com. visual",
    "cefav": "comitê especializado - fotografia, audio e vídeo",
    "ouvidoria": "ouvidoria",
  };

  function resolveUnidade(nomeBruto) {
    const limpo = String(nomeBruto || "").replace(/\s+/g, " ").trim().toLowerCase();
    if (unidByName.has(limpo)) return unidByName.get(limpo);
    if (demandanteAliases[limpo] && unidByName.has(demandanteAliases[limpo])) {
      return unidByName.get(demandanteAliases[limpo]);
    }
    const rawLow = String(nomeBruto || "").trim().toLowerCase();
    if (demandanteAliases[rawLow] && unidByName.has(demandanteAliases[rawLow])) {
      return unidByName.get(demandanteAliases[rawLow]);
    }
    throw new Error(`Unidade não encontrada para "${nomeBruto}"`);
  }

  // 2. Sincronizar Setores Técnicos
  console.log("[PCA 2027] Sincronizando 13 Setores Técnicos...");
  const setorTecnicoBySigla = new Map();
  for (const stDef of SETORES_TECNICOS_DEFINICAO) {
    const unid = unidByEmail.get(stDef.unidadeEmail.toLowerCase());
    let setor = await prisma.setorTecnico.findFirst({
      where: {
        OR: [
          { nome: stDef.nome },
          { email: stDef.unidadeEmail },
          { unidadeId: unid?.id ?? undefined },
        ],
      },
    });

    if (!setor) {
      setor = await prisma.setorTecnico.create({
        data: {
          nome: stDef.nome,
          vinculado: true,
          unidadeId: unid?.id ?? null,
          email: stDef.unidadeEmail,
          ativo: true,
        },
      });
      console.log(`[PCA 2027] Setor Técnico criado: ${stDef.sigla} - ${stDef.nome}`);
    } else {
      if (!setor.unidadeId && unid) {
        await prisma.setorTecnico.update({
          where: { id: setor.id },
          data: { unidadeId: unid.id, vinculado: true },
        });
      }
    }
    setorTecnicoBySigla.set(stDef.sigla.toUpperCase(), setor);
  }

  // 3. Sincronizar Categorias
  console.log(`[PCA 2027] Sincronizando ${payload.categorias.length} Categorias...`);
  for (const catDef of payload.categorias) {
    const st = setorTecnicoBySigla.get(catDef.setorTecnicoSigla.toUpperCase());
    const existente = await prisma.categoria.findFirst({ where: { nome: catDef.nome } });

    if (!existente) {
      await prisma.categoria.create({
        data: {
          nome: catDef.nome,
          tipo: catDef.tipo,
          setorTecnicoId: st?.id ?? null,
          classificacaoRubrica: catDef.classificacaoRubrica,
          codigoPcaPadrao: catDef.codigoPcaPadrao,
          tipoBemPadrao: catDef.tipoBemPadrao,
          fluxoContinuo: catDef.fluxoContinuo,
          dependeContrato: catDef.dependeContrato,
          ignoraPCA: catDef.ignoraPCA,
          ativa: true,
        },
      });
    } else {
      await prisma.categoria.update({
        where: { id: existente.id },
        data: {
          setorTecnicoId: st?.id ?? existente.setorTecnicoId,
          codigoPcaPadrao: catDef.codigoPcaPadrao ?? existente.codigoPcaPadrao,
          classificacaoRubrica: catDef.classificacaoRubrica ?? existente.classificacaoRubrica,
          fluxoContinuo: catDef.fluxoContinuo,
          dependeContrato: catDef.dependeContrato,
          ignoraPCA: catDef.ignoraPCA,
        },
      });
    }
  }

  const todasCategoriasDb = await prisma.categoria.findMany();
  const categoriaByName = new Map(todasCategoriasDb.map((c) => [c.nome, c]));

  // 4. Sincronizar Prioridades e Tipificações
  console.log("[PCA 2027] Sincronizando Prioridades e Tipificações...");
  const distinctPrios = new Map();
  distinctPrios.set("média", { frase: "Média", nivel: "MEDIA" });
  const distinctTips = new Set(["Necessidade acadêmica/administrativa de rotina (Fluxo Contínuo)"]);

  for (const it of payload.itensGeral) {
    const p = extrairPrioridade(it.prioridadeTexto);
    distinctPrios.set(p.frase.toLowerCase(), { frase: p.frase, nivel: p.nivel });
    if (it.tipoNecessidade) distinctTips.add(it.tipoNecessidade.trim().slice(0, 200));
  }

  await prisma.prioridade.createMany({
    data: Array.from(distinctPrios.values()),
    skipDuplicates: true,
  });
  await prisma.tipificacao.createMany({
    data: Array.from(distinctTips).map((nome) => ({ nome })),
    skipDuplicates: true,
  });

  const prioByFrase = new Map(
    (await prisma.prioridade.findMany()).map((p) => [p.frase.trim().toLowerCase(), p.id])
  );
  const tipByName = new Map(
    (await prisma.tipificacao.findMany()).map((t) => [t.nome.trim().toLowerCase(), t.id])
  );

  // 5. Sincronizar Catálogo de Materiais
  console.log("[PCA 2027] Sincronizando Catálogo de Materiais...");
  const existingCatalog = await prisma.itemCatalogo.findMany({
    select: { categoriaId: true, item: true },
  });
  const catalogSet = new Set(existingCatalog.map((c) => `${c.categoriaId}|${c.item.trim().toLowerCase()}`));
  const catalogToInsert = [];

  for (const it of payload.itensGeral) {
    const cat = categoriaByName.get(it.categoria);
    if (cat && cat.tipo === "MATERIAL") {
      const itemName = truncarNomeCatalogo(it.especificacao);
      const key = `${cat.id}|${itemName.toLowerCase()}`;
      if (!catalogSet.has(key)) {
        catalogSet.add(key);
        catalogToInsert.push({
          categoriaId: cat.id,
          item: itemName,
          valor: it.valorUnitario > 0 ? it.valorUnitario : 1,
          tipoBem: cat.tipoBemPadrao || "CONSUMO",
          ativo: true,
          origemSolicitacao: !it.fonteEspecificacao.toLowerCase().includes("catálogo"),
          liberadoCotaGeralParaOP: true,
        });
      }
    }
  }

  if (catalogToInsert.length > 0) {
    for (let i = 0; i < catalogToInsert.length; i += 500) {
      await prisma.itemCatalogo.createMany({
        data: catalogToInsert.slice(i, i + 500),
        skipDuplicates: true,
      });
    }
  }
  console.log(`[PCA 2027] ${catalogToInsert.length} novos itens adicionados ao catálogo.`);

  // 6. Sincronizar PCA 2027
  console.log("[PCA 2027] Sincronizando registro do PCA 2027...");
  const pca2027 = await prisma.pca.upsert({
    where: { ano: 2027 },
    update: {
      ativo: true,
      cotaGeral: 200000000.00,
      cotaOP: 4900000.00,
      dataAbertura: new Date(Date.UTC(2026, 0, 1)),
      dataFechamento: new Date(Date.UTC(2027, 11, 31)),
      aberturaExtraGeral: true,
      concluido: false,
    },
    create: {
      ano: 2027,
      ativo: true,
      cotaGeral: 200000000.00,
      cotaOP: 4900000.00,
      dataAbertura: new Date(Date.UTC(2026, 0, 1)),
      dataFechamento: new Date(Date.UTC(2027, 11, 31)),
      aberturaExtraGeral: true,
      concluido: false,
    },
  });

  // 7. Checar se já foi transposto (idempotência)
  const dfdsExistentes2027 = await prisma.dfd.count({ where: { ano: 2027 } });
  const forcarRecarga = process.env.FORCE_RELOAD_PCA2027 === "1" || process.env.FORCE_RELOAD_PCA2027 === "true";

  // O novo layout com separação de serviços por ID SEI produz 457 DFDs.
  // Se houver menos que 450 DFDs, ou se FORCE_RELOAD_PCA2027 estiver ativo, recarrega.
  if (dfdsExistentes2027 >= 450 && !forcarRecarga) {
    console.log(`[PCA 2027] O PCA 2027 já possui ${dfdsExistentes2027} DFDs cadastrados no banco (layout atualizado). Transposição preservada.`);
    return;
  }

  console.log(`[PCA 2027] Limpando DFDs e testes anteriores de 2027 (${dfdsExistentes2027} encontrados)...`);
  await prisma.dfd.deleteMany({ where: { ano: 2027 } });

  const adminUser = await prisma.usuario.findFirst({ where: { role: "ADMIN" } });
  const criadoPorId = adminUser?.id ?? "ADMIN_IMPORT_PCA_2027";
  const dataDesejada2027 = new Date(Date.UTC(2027, 7, 30));
  const agora = new Date();

  const numeroPorUnidade = new Map();
  function proximoNumero(unidadeId) {
    const atual = (numeroPorUnidade.get(unidadeId) || 0) + 1;
    numeroPorUnidade.set(unidadeId, atual);
    return atual;
  }

  const dfdsToInsert = [];
  const itensToInsert = [];

  // 8. Agrupar Itens da Lista Geral em DFDs Primários
  console.log("[PCA 2027] Agrupando 3.293 itens da Lista Geral em DFDs Primários...");
  const gruposGeral = new Map();
  for (const it of payload.itensGeral) {
    // Saneamento EDUERN SEI 44897642
    if (it.idSeiDfd === "44897642" || /curso\/setor\/atividade essencial pode parar/i.test(it.especificacao)) {
      it.especificacao = "Depósito de DOI - Identificador de Objeto Digital de Livros publicados";
    }

    const unidade = resolveUnidade(it.demandante);
    const cat = categoriaByName.get(it.categoria);
    const tipo = cat ? cat.tipo : "MATERIAL";
    const manterJunto = deveManterJunto(unidade.nome, it.categoria, tipo);

    let key;
    const idSeiLimpo = (it.idSeiDfd && String(it.idSeiDfd).trim()) || "(SEM_ID)";
    if (manterJunto) {
      key = `${unidade.id}||${it.categoria}`;
    } else {
      key = `${unidade.id}||${it.categoria}||${idSeiLimpo}`;
    }

    // Desmembrar Centro Cultural na PROEX em DFD próprio
    if (it.categoria === "Serviços diversos para eventos" && /Centro Cultural/i.test(it.especificacao)) {
      key += "||CENTRO_CULTURAL";
    }

    if (!gruposGeral.has(key)) {
      gruposGeral.set(key, {
        unidade,
        categoriaNome: it.categoria,
        idSeiDfd: manterJunto ? null : (idSeiLimpo !== "(SEM_ID)" ? idSeiLimpo : null),
        manterJunto,
        itens: [],
      });
    }
    gruposGeral.get(key).itens.push(it);
  }

  for (const grupo of gruposGeral.values()) {
    const cat = categoriaByName.get(grupo.categoriaNome);
    let melhorPrio = { nivel: "MEDIA", ordem: 2, frase: "Média" };
    const necCounts = new Map();
    const modCounts = new Map();
    const processosSet = new Set();
    const dfdsSeiSet = new Set();
    const setoresSet = new Set();

    for (const it of grupo.itens) {
      const p = extrairPrioridade(it.prioridadeTexto);
      if (p.ordem > melhorPrio.ordem) melhorPrio = p;
      if (it.tipoNecessidade) {
        const tn = it.tipoNecessidade.trim().slice(0, 200);
        necCounts.set(tn, (necCounts.get(tn) || 0) + 1);
      }
      const nat = it.modalidade.toLowerCase().includes("renov") ? "RENOVACAO" : "NOVA";
      modCounts.set(nat, (modCounts.get(nat) || 0) + 1);
      if (it.processo) processosSet.add(it.processo);
      if (it.idSeiDfd) dfdsSeiSet.add(it.idSeiDfd);
      if (it.setorSolicitante) setoresSet.add(it.setorSolicitante);
    }

    const domNec = [...necCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    const domNat = [...modCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "NOVA";
    const prioridadeId = prioByFrase.get(melhorPrio.frase.toLowerCase()) || prioByFrase.get("média");
    const tipificacaoId = domNec ? tipByName.get(domNec.toLowerCase()) || null : null;

    const processosStr = [...processosSet].join("; ") || null;
    const dfdsSeiStr = grupo.idSeiDfd || ([...dfdsSeiSet].join("; ") || null);
    const setoresArr = [...setoresSet];

    const sufixoSei = grupo.idSeiDfd ? `SEI ${grupo.idSeiDfd}` : null;
    const setorOuUnidade = setoresArr.length > 0 ? setoresArr.join(", ") : grupo.unidade.nome;
    let descricaoSumaria;

    if (CATEGORIAS_ALVO_OBJETO.includes(grupo.categoriaNome)) {
      const primeiroItem = grupo.itens[0]?.especificacao || grupo.categoriaNome;
      const objetoLimpo = resumirObjeto(primeiroItem, grupo.categoriaNome, setorOuUnidade, grupo.idSeiDfd);
      descricaoSumaria = formatarTitulo(objetoLimpo, sufixoSei, setorOuUnidade);
    } else {
      const seiTxt = sufixoSei ? ` (${sufixoSei})` : "";
      descricaoSumaria = (grupo.categoriaNome + seiTxt + ` — ${setorOuUnidade}`).slice(0, 200);
    }

    let justificativa =
      `Demanda primária da unidade ${grupo.unidade.nome} para a categoria "${grupo.categoriaNome}" no PCA 2027` +
      (processosStr ? ` (Processo SEI: ${processosStr}` + (dfdsSeiStr ? ` | ID SEI DFD: ${dfdsSeiStr}` : "") + `)` : "") +
      (setoresArr.length > 0 ? `. Setores/Cursos contemplados: ${setoresArr.join(", ")}` : "") +
      (necCounts.size > 0 ? `. Necessidades atendidas: ${[...necCounts.keys()].join("; ")}` : "") +
      `.`;
    if (justificativa.length < 60) {
      justificativa += " Demanda transposta do levantamento oficial do Plano de Contratações Anual 2027 da UERN.";
    }

    const dfdId = gerarId("dfd27");
    dfdsToInsert.push({
      id: dfdId,
      unidadeId: grupo.unidade.id,
      ano: 2027,
      numero: proximoNumero(grupo.unidade.id),
      descricaoSumaria,
      tipificacaoId,
      prioridadeId,
      justificativa,
      tipoDemanda: domNat,
      dataEntrega: domNat === "NOVA" ? dataDesejada2027 : null,
      dataRenovacao: domNat === "RENOVACAO" ? dataDesejada2027 : null,
      status: "AGUARDANDO_APROVACAO",
      enviadoParaAprovacaoEm: agora,
      criadoPorId,
      processoSeiOrigem: processosStr,
      idSeiDfdOrigem: dfdsSeiStr,
    });

    for (const it of grupo.itens) {
      const enq = mapearEnquadramento(it.fonteRecurso);
      const conv = enq === "CONVENIO" ? extrairConvenio(it.convenio) : { numero: null, ano: null };
      const recExtra = enq === "RECURSOS_EXTRA" ? extrairRecursoExtra(it.fonteRecurso, it.convenio) : { agencia: null, conta: null };
      const nomeItemMat = truncarNomeCatalogo(it.especificacao);

      const partesCorrelacao = [];
      if (it.setorSolicitante) partesCorrelacao.push(`Setor/Curso: ${it.setorSolicitante}`);
      if (it.processo) partesCorrelacao.push(`Processo SEI: ${it.processo}`);
      if (it.idSeiDfd) partesCorrelacao.push(`ID SEI DFD: ${it.idSeiDfd}`);
      if (it.especificacao.length > 1200) partesCorrelacao.push(`Especificação integral: ${it.especificacao}`);
      if (it.observacoes) partesCorrelacao.push(`Obs.: ${it.observacoes}`);
      const correlacao = partesCorrelacao.join(" | ") || `Conforme levantamento do PCA 2027 (${grupo.unidade.nome}).`;

      itensToInsert.push({
        id: gerarId("it27"),
        dfdId,
        tipo: cat.tipo,
        enquadramento: enq,
        convenioNumero: conv.numero,
        convenioAno: conv.ano,
        emendaParlamentar: Boolean(it.emenda && it.emenda.toLowerCase() !== "não"),
        parlamentarNome: it.beneficiarioConvenio || it.emenda || null,
        recursoExtraAgencia: recExtra.agencia,
        recursoExtraConta: recExtra.conta,
        categoriaId: cat.id,
        itemCatalogoNome: cat.tipo === "MATERIAL" ? nomeItemMat : null,
        itemNomeLivre: cat.tipo === "SERVICO" ? it.especificacao.trim() : null,
        tipoBem: cat.tipo === "MATERIAL" ? (cat.tipoBemPadrao || "CONSUMO") : null,
        quantidade: it.quantidade,
        valorUnit: it.valorUnitario,
        valorTotal: it.valorTotal,
        correlacao,
        processoSeiOrigem: it.processo,
        idSeiDfdOrigem: it.idSeiDfd,
        setorSolicitanteTexto: it.setorSolicitante,
        codigoPncpReferencia: it.codigoPncp,
        fonteEspecificacao: it.fonteEspecificacao,
      });
    }
  }

  // 9. Agrupar Itens da Aba Diárias em DFDs Primários
  console.log("[PCA 2027] Agrupando 107 itens de Diárias, Passagens e Hospedagens em DFDs Primários...");
  const gruposDiarias = new Map();
  for (const it of payload.itensDiarias) {
    const unidade = resolveUnidade(it.demandante);
    const cat = categoriaByName.get(it.categoria);
    const tipo = cat ? cat.tipo : "SERVICO";
    const manterJunto = deveManterJunto(unidade.nome, it.categoria, tipo);

    let key;
    const idSeiLimpo = (it.idSeiDfd && String(it.idSeiDfd).trim()) || "(SEM_ID)";
    if (manterJunto) {
      key = `${unidade.id}||${it.categoria}`;
    } else {
      key = `${unidade.id}||${it.categoria}||${idSeiLimpo}`;
    }

    if (!gruposDiarias.has(key)) {
      gruposDiarias.set(key, {
        unidade,
        categoriaNome: it.categoria,
        idSeiDfd: manterJunto ? null : (idSeiLimpo !== "(SEM_ID)" ? idSeiLimpo : null),
        manterJunto,
        itens: [],
      });
    }
    gruposDiarias.get(key).itens.push(it);
  }

  const prioMediaId = prioByFrase.get("média");
  const tipRotinaId = tipByName.get("necessidade acadêmica/administrativa de rotina (fluxo contínuo)") || null;

  for (const g of gruposDiarias.values()) {
    const dfdsSei = g.idSeiDfd || ([...new Set(g.itens.map((x) => x.idSeiDfd).filter(Boolean))].join("; ") || null);
    const cat = categoriaByName.get(g.categoriaNome);
    const sufixoSei = g.idSeiDfd ? ` (SEI ${g.idSeiDfd})` : "";
    const descricaoSumaria = `${g.categoriaNome}${sufixoSei} — ${g.unidade.nome}`.slice(0, 200);

    let justificativa =
      `Demanda de ${g.categoriaNome} da unidade ${g.unidade.nome} para o exercício do PCA 2027` +
      (dfdsSei ? ` (ID SEI DFD: ${dfdsSei})` : "") +
      `, destinada a viabilizar deslocamentos acadêmicos, viagens técnicas, representações e eventos institucionais.`;

    const dfdId = gerarId("dfd27d");
    dfdsToInsert.push({
      id: dfdId,
      unidadeId: g.unidade.id,
      ano: 2027,
      numero: proximoNumero(g.unidade.id),
      descricaoSumaria,
      tipificacaoId: tipRotinaId,
      prioridadeId: prioMediaId,
      justificativa,
      tipoDemanda: "FLUXO_CONTINUO",
      dataEntrega: dataDesejada2027,
      dataRenovacao: null,
      status: "AGUARDANDO_APROVACAO",
      enviadoParaAprovacaoEm: agora,
      criadoPorId,
      processoSeiOrigem: null,
      idSeiDfdOrigem: dfdsSei,
    });

    for (const it of g.itens) {
      const partes = [`Especificação: ${it.especificacao}`];
      if (it.idSeiDfd) partes.push(`ID SEI DFD: ${it.idSeiDfd}`);
      if (it.observacoes) partes.push(`Obs.: ${it.observacoes}`);

      itensToInsert.push({
        id: gerarId("it27d"),
        dfdId,
        tipo: "SERVICO",
        enquadramento: mapearEnquadramento(it.fonteRecurso),
        convenioNumero: null,
        convenioAno: null,
        emendaParlamentar: false,
        parlamentarNome: null,
        recursoExtraAgencia: null,
        recursoExtraConta: null,
        categoriaId: cat.id,
        itemCatalogoNome: null,
        itemNomeLivre: it.especificacao,
        tipoBem: null,
        quantidade: it.quantidade,
        valorUnit: it.valorUnitario,
        valorTotal: it.valorTotal,
        correlacao: partes.join(" | "),
        processoSeiOrigem: null,
        idSeiDfdOrigem: it.idSeiDfd,
        setorSolicitanteTexto: null,
        codigoPncpReferencia: it.codigoPncp,
        fonteEspecificacao: "Inserção Manual",
      });
    }
  }

  // 10. Inserir DFDs e Itens no Banco
  console.log(`[PCA 2027] Gravando ${dfdsToInsert.length} DFDs no banco de dados...`);
  await prisma.dfd.createMany({ data: dfdsToInsert });

  console.log(`[PCA 2027] Gravando ${itensToInsert.length} Itens de DFD em lotes...`);
  for (let i = 0; i < itensToInsert.length; i += 500) {
    await prisma.itemDfd.createMany({ data: itensToInsert.slice(i, i + 500) });
  }

  // 11. Validação Final
  const [totalDfds2027, aggGeral, aggDiarias, aggPassagensHosp, aggTotal] = await Promise.all([
    prisma.dfd.count({ where: { ano: 2027, status: "AGUARDANDO_APROVACAO" } }),
    prisma.itemDfd.aggregate({
      where: { dfd: { ano: 2027 }, categoria: { nome: { notIn: ["Diárias", "Passagens Aéreas", "Hospedagens"] } } },
      _count: { _all: true },
      _sum: { valorTotal: true },
    }),
    prisma.itemDfd.aggregate({
      where: { dfd: { ano: 2027 }, categoria: { nome: "Diárias" } },
      _count: { _all: true },
      _sum: { valorTotal: true },
    }),
    prisma.itemDfd.aggregate({
      where: { dfd: { ano: 2027 }, categoria: { nome: { in: ["Passagens Aéreas", "Hospedagens"] } } },
      _count: { _all: true },
      _sum: { valorTotal: true },
    }),
    prisma.itemDfd.aggregate({
      where: { dfd: { ano: 2027 } },
      _count: { _all: true },
      _sum: { valorTotal: true },
    }),
  ]);

  console.log("\n=======================================================");
  console.log("=== RESUMO FINAL DA TRANSPOSIÇÃO DO PCA 2027 ===");
  console.log("=======================================================");
  console.log(`- Total de DFDs Primários em AGUARDANDO_APROVACAO: ${totalDfds2027}`);
  console.log(`- Itens da Lista Geral Categoria: ${aggGeral._count._all} itens | R$ ${Number(aggGeral._sum.valorTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`- Itens de Passagens Aéreas e Hospedagens (No PCA): ${aggPassagensHosp._count._all} itens | R$ ${Number(aggPassagensHosp._sum.valorTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`- Itens de Diárias (Fora do PCA, apenas Cota OP): ${aggDiarias._count._all} itens | R$ ${Number(aggDiarias._sum.valorTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log(`- Total Geral de Itens Transpostos: ${aggTotal._count._all} itens`);
  console.log(`- Total Financeiro Geral: R$ ${Number(aggTotal._sum.valorTotal || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
  console.log("=======================================================\n");
}

if (process.argv[1] && process.argv[1].endsWith("transpor-pca-2027-oficial.mjs")) {
  transporPca2027Oficial()
    .catch((e) => {
      console.error("[ERRO CRÍTICO NA TRANSPOSIÇÃO DO PCA 2027]:", e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}

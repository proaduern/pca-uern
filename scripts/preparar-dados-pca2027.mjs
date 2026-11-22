import fs from "fs";
import path from "path";
import XLSX from "xlsx";

const excelPath = "C:/Users/pedro/.gemini/antigravity/brain/ae4fb885-028f-4fb4-b338-dc5c4fc4fc74/scratch/pca2027.xlsx";
const pncpPath = "C:/Users/pedro/.gemini/antigravity/brain/ae4fb885-028f-4fb4-b338-dc5c4fc4fc74/scratch/pncp_2027_items.json";

const wb = XLSX.readFile(excelPath);
const pncpApiItems = JSON.parse(fs.readFileSync(pncpPath, "utf8"));

function normCat(c) {
  const s = String(c || "")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  if (s.toLowerCase() === "pagamento de taxa / associação") return "Pagamento de Taxa / Associação";
  return s;
}

function truncarNomeCatalogo(espec) {
  const limpo = String(espec || "").trim();
  if (limpo.length <= 1200) return limpo;
  return limpo.slice(0, 1197) + "...";
}

const CATEGORIA_SERVICO_KEYWORDS = [
  "serviç", "terceiriz", "locação", "concessão", "manutenção", "água potável",
  "água e esgoto", "energia elétrica", "dedetiz", "gerador", "fornecimento continuado",
  "seguro", "pagamento de taxa", "obra ou reforma", "biblioteca digital", "biblioteca virtual",
  "spda", "coffee break", "postais", "agenciamento", "apoio para sala", "gestão de frota",
  "motorista", "nutricion", "outsourcing", "plataformas elevatórias", "rede elétrica",
  "softwares e licenciamentos", "contratação de serviços",
];

function classificarTipoCategoria(nomeCat, classificacaoTexto) {
  const n = nomeCat.toLowerCase();
  const cl = String(classificacaoTexto || "").toLowerCase();
  if (
    n.includes("equipamentos e materiais") ||
    n.includes("equipamentos odontológicos") ||
    n.includes("insumos e materiais") ||
    n.includes("informática -equipamentos") ||
    n.includes("informática - equipamentos") ||
    n.includes("aquisição veículos") ||
    n.includes("acervo bibliográfico") ||
    (n.includes("climatização") && !n.includes("manutenção")) ||
    n.includes("eletrodomésticos") ||
    (n.includes("mobília") && !n.includes("planejada")) ||
    n.includes("materiais")
  ) {
    return "MATERIAL";
  }
  if (CATEGORIA_SERVICO_KEYWORDS.some((k) => n.includes(k))) return "SERVICO";
  if (cl.includes("3.3.9.0.39") || cl.includes("3.3.90.37") || cl.includes("33.90.36") || cl.includes("4.4.9.0.51")) {
    return "SERVICO";
  }
  return "MATERIAL";
}

const CONSUMO_KEYWORDS = [
  "consumo", "expediente", "limpeza", "insumos", "copa", "cozinha",
  "alimentício", "alimento", "roedores", "gás", "combustível",
];

function classificarTipoBem(nomeCat, classificacaoTexto) {
  const n = nomeCat.toLowerCase();
  const cl = String(classificacaoTexto || "").toLowerCase();
  if (CONSUMO_KEYWORDS.some((k) => n.includes(k))) return "CONSUMO";
  if (cl.includes("3.3.9.0.30") && !cl.includes("4.4.9.0.52")) return "CONSUMO";
  return "PERMANENTE";
}

const CODIGO_PNCP_POR_CATEGORIA = new Map([
  // 18 códigos anotados nas abas dos Setores Técnicos da planilha
  [normCat("Copa e Cozinha"), "925543-3/2027"],
  [normCat("Gêneros Alimentícios"), "925543-4/2027"],
  [normCat("Materiais de Limpeza, Higienização e Proteção"), "925543-5/2027"],
  [normCat("Material de expediente e de uso didático"), "925543-6/2027"],
  [normCat("Materiais Permanentes e Equipamentos Odontológicos e Laboratorial"), "925543-11/2027"],
  [normCat("Manutenção de Equipamentos Laboratórios"), "925543-131/2027"],
  [normCat("Serviços diversos para eventos – Veste Talar"), "925543-19/2027"],
  [normCat("Serviços de Fornecimento de Coffee break"), "925543-98/2027"],
  [normCat("Serviços diversos para eventos – Tendas Tamanhos Diversos"), "925543-108/2027"],
  [normCat("Serviço de Diagramação e Impressão de Livros"), "925543-138/2027"],
  [normCat("Serviços diversos para eventos -Logística"), "925543-142/2027"],
  [normCat("Serviços diversos para eventos -Cerimoniais"), "925543-143/2027"],
  [normCat("Serviços diversos para eventos – Lavanderia"), "925543-144/2027"],
  [normCat("Áudio e Vídeo – Contratação de serviços profissionais para TV e Rádio."), "925543-126/2027"],
  [normCat("Biotério – Acomodação para Roedores"), "925543-20/2027"],
  [normCat("Biotério – Alimento Roedores"), "925543-20/2027"],
  [normCat("Manutenção predial"), "925543-134/2027"],
  [normCat("Softwares e Licenciamentos - Cessão do Direito de uso de softwares diversos"), "925543-158/2027"],

  // Códigos do Portal PNCP (https://pncp.gov.br/app/pca/08258295000102/2027)
  [normCat("Acervo Bibliográfico"), "925543-17/2027"],
  [normCat("Gás de Cozinha"), "925543-18/2027"],
  [normCat("Outsourcing de impressão"), "925543-49/2027"],
  [normCat("Softwares e Licenciamentos - Stela Experta-PG"), "925543-51/2027"],
  [normCat("Softwares e Licenciamentos - Banco de Preços"), "925543-52/2027"],
  [normCat("Serviço emissão e entrega de bilhetes aéreos"), "925543-99/2027"],
  [normCat("Agenciamento de hospedagem"), "925543-100/2027"],
  [normCat("Passagens Aéreas"), "925543-99/2027"],
  [normCat("Hospedagens"), "925543-100/2027"],
  [normCat("Produtos e serviços postais"), "925543-101/2027"],
  [normCat("Contratação do Fornecimento de Energia Elétrica"), "925543-102/2027"],
  [normCat("Água potável e serviços de esgoto"), "925543-103/2027"],
  [normCat("Serviços de seguro de vida para discentes em atividades práticas"), "925543-104/2027"],
  [normCat("Serviços de seguro de vida para discentes em estágios"), "925543-104/2027"],
  [normCat("Rede elétrica de média e baixa tensão – Manutenção"), "925543-110/2027"],
  [normCat("Plataformas Elevatórias - Fornecimento e instalação"), "925543-111/2027"],
  [normCat("Serviços diversos para eventos"), "925543-114/2027"],
  [normCat("Fornecimento e Manutenção de Grupos Geradores"), "925543-116/2027"],
  [normCat("Contratação de empresa especializada para execução de SPDA"), "925543-117/2027"],
  [normCat("Serviços de publicações DOU"), "925543-118/2027"],
  [normCat("Serviços de publicações – DOE"), "925543-119/2027"],
  [normCat("Serviço publicação em jornal"), "925543-120/2027"],
  [normCat("Biblioteca Digital de Livros"), "925543-121/2027"],
  [normCat("Motorista"), "925543-122/2027"],
  [normCat("Serviço de motoristas"), "925543-122/2027"],
  [normCat("Serviço manutenção de piscina"), "925543-123/2027"],
  [normCat("Serviço gerenciamento para aquisição de combustíveis"), "925543-124/2027"],
  [normCat("Gestão de Frota – Manutenção Preventiva e Corretiva"), "925543-125/2027"],
  [normCat("Manutenção de Equipamentos Climatização"), "925543-127/2027"],
  [normCat("Serviço de Manutenção de extintores"), "925543-129/2027"],
  [normCat("Manutenção de Cadeiras"), "925543-130/2027"],
  [normCat("Serviço de telefonia Móvel"), "925543-132/2027"],
  [normCat("Mobília Planejada"), "925543-133/2027"],
  [normCat("Manutenção de Elevadores"), "925543-135/2027"],
  [normCat("Serviço de plotagem tamanhos diversos."), "925543-136/2027"],
  [normCat("Apoio para sala de aula para pessoas com deficiência"), "925543-139/2027"],
  [normCat("Serviço de Coleta de resíduos de saúde"), "925543-140/2027"],
  [normCat("Dedetização e Descupinização"), "925543-141/2027"],
  [normCat("Serviço de Vigilância"), "925543-149/2027"],
  [normCat("Serviços terceirizados de limpeza, conservação, copeiragem, jardinagem, recepção e apoio ao almoxarifado"), "925543-150/2027"],
  [normCat("Serviço de Digitalização de acervo"), "925543-154/2027"],
  [normCat("Obra ou Reforma"), "925543-53/2027"],
  [normCat("Serviço de engenharia ou arquitetura"), "925543-113/2027"],
  [normCat("Serviços de TI"), "925543-21/2027"],
]);

function resolverCodigoPncpDoItem(nomeCatNorm, especificacao, valorTotal) {
  if (
    nomeCatNorm === normCat("Obra ou Reforma") ||
    nomeCatNorm === normCat("Serviço de engenharia ou arquitetura") ||
    nomeCatNorm === normCat("Serviços de TI") ||
    nomeCatNorm === normCat("Mobília Planejada")
  ) {
    const espLow = String(especificacao || "").toLowerCase().trim();
    const sameVal = pncpApiItems.filter((p) => Math.abs(Number(p.valorTotal) - valorTotal) < 1);
    if (sameVal.length === 1) return sameVal[0].grupoContratacaoCodigo;
    if (sameVal.length > 1) {
      const best = sameVal.find((p) => {
        const gLow = String(p.grupoContratacaoNome || "").toLowerCase();
        return espLow.includes(gLow.slice(0, 18)) || gLow.includes(espLow.slice(0, 18));
      });
      return (best || sameVal[0]).grupoContratacaoCodigo;
    }
    const byName = pncpApiItems.find((p) => {
      const gLow = String(p.grupoContratacaoNome || "").toLowerCase().trim();
      return gLow.length >= 12 && (espLow.includes(gLow.slice(0, 22)) || gLow.includes(espLow.slice(0, 22)));
    });
    if (byName) return byName.grupoContratacaoCodigo;
  }
  return CODIGO_PNCP_POR_CATEGORIA.get(nomeCatNorm) || null;
}

// 1. Mapeamento de DFD SEI e Processo das abas setoriais
const sectorDfdLookup = new Map();
const sectorTabs = ["Almoxarifado", "Patrimônio", "CEEL", "CEECV", "CEFAV", "CESL", "DAS", "DSIB", "DT", "PROAD", "SOBE", "STI"];
for (const tab of sectorTabs) {
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[tab], { header: 1, defval: "" });
  const hIdx = rows.findIndex((r) => r && r.some((c) => String(c).trim() === "Demandante"));
  if (hIdx < 0) continue;
  const h = rows[hIdx].map((c) => String(c).trim());
  const idxProc = h.indexOf("Processo");
  const idxDem = h.indexOf("Demandante");
  const idxDfd = h.indexOf("ID SEI do DFD Associado ao Item");
  const idxCat = h.indexOf("Categoria");
  const idxEsp = h.indexOf("Especificação");
  for (let i = hIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    const dem = String(r[idxDem] || "").trim();
    const cat = normCat(r[idxCat]);
    const esp = String(r[idxEsp] || "").trim();
    const dfd = idxDfd >= 0 ? String(r[idxDfd] || "").trim() : "";
    const proc = idxProc >= 0 ? String(r[idxProc] || "").trim() : "";
    if (dem && cat && (dfd || proc)) {
      const key = `${dem.toLowerCase()}|${cat.toLowerCase()}|${esp.slice(0, 40).toLowerCase()}`;
      sectorDfdLookup.set(key, { dfd, proc });
    }
  }
}

// 2. Extração da Lista Geral Categoria
const lgRows = XLSX.utils.sheet_to_json(wb.Sheets["Lista Geral Categoria"], { header: 1, defval: "" });
const categoriasMap = new Map();
const itensGeral = [];

for (let i = 9; i < lgRows.length; i++) {
  const r = lgRows[i];
  const setorTec = String(r[1]).trim();
  if (!setorTec || setorTec === "a" || setorTec === "i") continue;

  const demandante = String(r[3]).trim();
  const categoriaNorm = normCat(r[13]);
  const especificacao = String(r[14]).trim();
  let processo = String(r[2]).trim();
  let idSeiDfd = String(r[5]).trim();

  if (!idSeiDfd || !processo) {
    const lookupKey = `${demandante.toLowerCase()}|${categoriaNorm.toLowerCase()}|${especificacao.slice(0, 40).toLowerCase()}`;
    const found = sectorDfdLookup.get(lookupKey);
    if (found) {
      if (!idSeiDfd && found.dfd) idSeiDfd = found.dfd;
      if (!processo && found.proc) processo = found.proc;
    }
  }

  const quantidade = Number(r[15]) > 0 ? Number(r[15]) : 1;
  const valorTotal = Number(r[19]) || 0;
  const valorUnitBruto = Number(r[18]) || 0;
  const valorUnitario = valorUnitBruto > 0 ? valorUnitBruto : valorTotal / quantidade;
  const classificacao = String(r[11]).trim().replace(/\s+/g, " ");

  if (!categoriasMap.has(categoriaNorm)) {
    const tipo = classificarTipoCategoria(categoriaNorm, classificacao);
    const tipoBemPadrao = tipo === "MATERIAL" ? classificarTipoBem(categoriaNorm, classificacao) : null;
    const codPncp = CODIGO_PNCP_POR_CATEGORIA.get(categoriaNorm) || null;
    categoriasMap.set(categoriaNorm, {
      nome: categoriaNorm,
      tipo,
      setorTecnicoSigla: setorTec.toUpperCase(),
      tipoBemPadrao,
      classificacaoRubrica: classificacao,
      codigoPcaPadrao: codPncp,
      fluxoContinuo: false,
      dependeContrato: true,
      ignoraPCA: false,
    });
  }

  const codPncpItem = resolverCodigoPncpDoItem(categoriaNorm, especificacao, valorTotal);

  itensGeral.push({
    origemAba: "Lista Geral Categoria",
    setorTecnicoSigla: setorTec.toUpperCase(),
    processo: processo || null,
    demandante,
    setorSolicitante: String(r[4]).trim() || null,
    idSeiDfd: idSeiDfd || null,
    fonteRecurso: String(r[6]).trim() || "OP 2027",
    convenio: String(r[7]).trim() || null,
    emenda: String(r[8]).trim() || null,
    beneficiarioConvenio: String(r[9]).trim() || null,
    fonteEspecificacao: String(r[10]).trim() || "Inserção Manual",
    classificacao,
    modalidade: String(r[12]).trim(),
    categoria: categoriaNorm,
    especificacao: especificacao || categoriaNorm,
    quantidade,
    prioridadeTexto: String(r[16]).trim() || "Média",
    tipoNecessidade: String(r[17]).trim() || "Necessidade de rotina",
    valorUnitario,
    valorTotal,
    observacoes: String(r[20]).trim() || null,
    codigoPncp: codPncpItem,
  });
}

// 3. Extração da Aba Diárias
const diariasRows = XLSX.utils.sheet_to_json(wb.Sheets["Diárias"], { header: 1, defval: "" });
const itensDiarias = [];

// Adicionar as 3 categorias de Diárias/Passagens/Hospedagens no categoriasMap
categoriasMap.set("Diárias", {
  nome: "Diárias",
  tipo: "SERVICO",
  setorTecnicoSigla: "DIARIAS",
  tipoBemPadrao: null,
  classificacaoRubrica: "3.3.9.0.14 - Diárias - Civil",
  codigoPcaPadrao: null,
  fluxoContinuo: true,
  dependeContrato: false,
  ignoraPCA: true, // DIÁRIAS NÃO ENTRA NO PCA (apenas na cota OP da unidade)
});

categoriasMap.set("Passagens Aéreas", {
  nome: "Passagens Aéreas",
  tipo: "SERVICO",
  setorTecnicoSigla: "DIARIAS",
  tipoBemPadrao: null,
  classificacaoRubrica: "3.3.9.0.33 - Passagens e Despesas com Locomoção",
  codigoPcaPadrao: "925543-99/2027",
  fluxoContinuo: false,
  dependeContrato: true,
  ignoraPCA: false, // PASSAGENS ENTRA NO PCA
});

categoriasMap.set("Hospedagens", {
  nome: "Hospedagens",
  tipo: "SERVICO",
  setorTecnicoSigla: "DIARIAS",
  tipoBemPadrao: null,
  classificacaoRubrica: "3.3.9.0.39 - Outros Serviços de Terceiros - Pessoa Jurídica",
  codigoPcaPadrao: "925543-100/2027",
  fluxoContinuo: false,
  dependeContrato: true,
  ignoraPCA: false, // HOSPEDAGENS ENTRA NO PCA
});

for (let i = 5; i < diariasRows.length; i++) {
  const r = diariasRows[i];
  const demandante = String(r[0]).trim();
  if (!demandante) continue;
  const idSeiDfd = String(r[1]).trim() || null;
  const fonteRecurso = String(r[2]).trim() || "OP 2027";
  const especificacao = String(r[3]).trim() || "Diárias";
  const quantidade = Number(r[4]) > 0 ? Number(r[4]) : 1;
  const valorTotal = Number(r[6]) || Number(r[5]) * quantidade || 0;
  const valorUnitario = Number(r[5]) > 0 ? Number(r[5]) : valorTotal / quantidade;
  const observacoes = String(r[7]).trim() || null;

  const espLow = especificacao.toLowerCase();
  let categoria = "Diárias";
  let codPncp = null;
  if (espLow.includes("passagen") || espLow.includes("passagem")) {
    categoria = "Passagens Aéreas";
    codPncp = "925543-99/2027";
  } else if (espLow.includes("hospedagen") || espLow.includes("hospedagem")) {
    categoria = "Hospedagens";
    codPncp = "925543-100/2027";
  }

  itensDiarias.push({
    origemAba: "Diárias",
    setorTecnicoSigla: "DIARIAS",
    processo: null,
    demandante,
    setorSolicitante: null,
    idSeiDfd,
    fonteRecurso,
    convenio: null,
    emenda: null,
    beneficiarioConvenio: null,
    fonteEspecificacao: "Inserção Manual",
    classificacao: categoria === "Diárias" ? "3.3.9.0.14 - Diárias - Civil" : "3.3.9.0.39 - Serviços",
    modalidade: "Contratação",
    categoria,
    especificacao,
    quantidade,
    prioridadeTexto: "Média",
    tipoNecessidade: "Necessidade acadêmica/administrativa de rotina (Fluxo Contínuo)",
    valorUnitario,
    valorTotal,
    observacoes,
    codigoPncp: codPncp,
  });
}

const payload = {
  versao: "2027-oficial-v1",
  geradoEm: new Date().toISOString(),
  totais: {
    totalItensGeral: itensGeral.length,
    somaGeral: itensGeral.reduce((s, it) => s + it.valorTotal, 0),
    totalItensDiarias: itensDiarias.length,
    somaDiarias: itensDiarias.reduce((s, it) => s + it.valorTotal, 0),
    totalGeralItens: itensGeral.length + itensDiarias.length,
    somaTotalGeral: itensGeral.reduce((s, it) => s + it.valorTotal, 0) + itensDiarias.reduce((s, it) => s + it.valorTotal, 0),
  },
  categorias: Array.from(categoriasMap.values()),
  itensGeral,
  itensDiarias,
};

const outputPath = path.resolve("scripts/data/pca2027-preparado.json");
fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2), "utf8");
console.log(`[SUCESSO] Payload salvo em ${outputPath}`);
console.log(`- Itens Geral: ${payload.totais.totalItensGeral} | R$ ${payload.totais.somaGeral.toFixed(2)}`);
console.log(`- Itens Diárias/Passagens/Hospedagens: ${payload.totais.totalItensDiarias} | R$ ${payload.totais.somaDiarias.toFixed(2)}`);
console.log(`- Total Geral: ${payload.totais.totalGeralItens} | R$ ${payload.totais.somaTotalGeral.toFixed(2)}`);
console.log(`- Categorias mapeadas: ${payload.categorias.length}`);

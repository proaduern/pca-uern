import ExcelJS from "exceljs";

export interface ItemExportacaoBancoPrecos {
  nome: string;
  descricao: string;
  quantidade: number;
}

export interface ItemImportadoBancoPrecos {
  itemOrdem: number;
  nome: string;
  precoEstimadoColE: number;
  quantidade: number;
  unidade: string;
  total: number;
}

export interface ResultadoImportacaoBancoPrecos {
  responsavelNome: string | null;
  responsavelMatricula: string | null;
  periodoPesquisa: string | null;
  relatorioGerado: string | null;
  processoReferencia: string | null;
  itensCotados: ItemImportadoBancoPrecos[];
}

const UNIDADES_BASE_MODELO: [string, string][] = [
  ["Adesivos", "ADS"],
  ["Aerossóis", "AER"],
  ["Ampolas", "AMP"],
  ["Anos", "A"],
  ["Ares", "AR"],
  ["Baldes", "BD"],
  ["Bandejas", "BJ"],
  ["Barras", "BA"],
  ["Bisnagas", "BS"],
  ["Blisters", "BT"],
  ["Blocos", "BL"],
  ["Bobinas", "BO"],
  ["Bolsas", "BOL"],
  ["Bombonas", "BB"],
  ["Botijas", "BTJ"],
  ["Cachos", "CAC"],
  ["Caixas", "CX"],
  ["Calorias", "CAL"],
  ["Cápsulas", "CA"],
  ["Carretéis", "CRT"],
  ["Cartelas", "CTE"],
  ["Centímetros", "CM"],
  ["Centímetros Cúbicos", "CM³"],
  ["Centos", "CT"],
  ["Comprimidos", "CP"],
  ["Conjuntos", "CJT"],
  ["Cremes", "CRM"],
  ["Diárias", "DI"],
  ["Dias", "D"],
  ["Drágeas", "DG"],
  ["Dúzias", "DZ"],
  ["Embalagens", "EBG"],
  ["Envelopes", "EV"],
  ["Fardos", "FRD"],
  ["Fichas", "FC"],
  ["Flaconetes", "FCN"],
  ["Folhas", "FL"],
  ["Frascos", "FR"],
  ["Galões", "GAL"],
  ["Géis", "GEL"],
  ["Geleias", "GLA"],
  ["Gramas", "G"],
  ["Hectares", "HA"],
  ["Horas", "H"],
  ["Jogos", "JG"],
  ["Latas", "LT"],
  ["Litros", "L"],
  ["Maços", "MC"],
  ["Meses", "M"],
  ["Metros", "MT"],
  ["Metros Cúbicos", "M³"],
  ["Metros Quadrados", "M²"],
  ["Milheiros", "MIL"],
  ["Miligramas", "MG"],
  ["Mililitros", "ML"],
  ["Milímetros", "MM"],
  ["Pacotes", "PCT"],
  ["Pares", "PAR"],
  ["Peças", "PC"],
  ["Potes", "PT"],
  ["Quilogramas", "KG"],
  ["Quilômetros", "KM"],
  ["Resmas", "RSM"],
  ["Rolos", "RL"],
  ["Sacos", "SC"],
  ["Serviços", "SRV"],
  ["Tabletes", "TBL"],
  ["Tambores", "TB"],
  ["Toneladas", "TON"],
  ["Tubos", "TUB"],
  ["Unidades", "UN"],
  ["Vidros", "VD"],
];

const UFS_BASE_MODELO = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

/**
 * Gera o buffer .xlsx no exato formato do Modelo.xlsx do Sistema Banco de Preços:
 * - Colunas A (Código), F (Cidade), G (UF), H (Observação) e I (Lote) ficam em branco;
 * - Coluna B: Nome (Até 250 caracteres);
 * - Coluna C: Descrição (Texto Livre);
 * - Coluna D: Quantidade;
 * - Coluna E: Unidade De Medida -> sempre "Unidades".
 */
export async function gerarXlsxModeloBancoPrecos(
  itens: ItemExportacaoBancoPrecos[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();

  // Aba 1: Exemplo_Itens (exatamente como no Modelo.xlsx)
  const ws = wb.addWorksheet("Exemplo_Itens");
  ws.columns = [
    { width: 29.1 }, // A: Código
    { width: 29.1 }, // B: Nome (Até 250 caracteres)
    { width: 40.7 }, // C: Descrição (Texto Livre)
    { width: 10.9 }, // D: Quantidade
    { width: 17.5 }, // E: Unidade De Medida
    { width: 20.0 }, // F: Cidade
    { width: 10.7 }, // G: UF (Estado)
    { width: 46.6 }, // H: Observação (Texto Livre)
    { width: 46.6 }, // I: Lote
  ];

  const headers: { col: number; text: string; obrigatorio: boolean }[] = [
    { col: 1, text: "Código", obrigatorio: false },
    { col: 2, text: "Nome (Até 250 caracteres)", obrigatorio: true },
    { col: 3, text: "Descrição (Texto Livre)", obrigatorio: true },
    { col: 4, text: "Quantidade ", obrigatorio: true },
    { col: 5, text: "Unidade De Medida", obrigatorio: true },
    { col: 6, text: "Cidade", obrigatorio: false },
    { col: 7, text: "UF (Estado)", obrigatorio: false },
    { col: 8, text: "Observação (Texto Livre)", obrigatorio: false },
    { col: 9, text: "Lote", obrigatorio: false },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 15;

  for (const h of headers) {
    const cell = headerRow.getCell(h.col);
    cell.value = h.text;
    cell.font = {
      name: "Calibri",
      size: 12,
      color: { argb: "FFFFFFFF" },
      family: 2,
    };
    cell.fill = h.obrigatorio
      ? {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF007F64" },
          bgColor: { argb: "FF008080" },
        }
      : {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFFF00" },
          bgColor: { argb: "FFFFFF00" },
        };
    cell.numFmt = "General";
  }

  const fontDados: Partial<ExcelJS.Font> = {
    name: "Calibri",
    size: 12,
    color: { argb: "FF007F64" },
    family: 2,
  };

  itens.forEach((it, idx) => {
    const row = ws.getRow(idx + 2);
    row.height = 15;
    // A: Código -> vazio
    row.getCell(1).value = null;
    // B: Nome (Até 250 caracteres)
    row.getCell(2).value = (it.nome || "").trim().slice(0, 250);
    row.getCell(2).font = fontDados;
    // C: Descrição (Texto Livre)
    row.getCell(3).value = (it.descricao || it.nome || "").trim();
    row.getCell(3).font = fontDados;
    // D: Quantidade
    row.getCell(4).value = Number(it.quantidade) || 1;
    row.getCell(4).font = fontDados;
    // E: Unidade De Medida -> sempre "Unidades"
    row.getCell(5).value = "Unidades";
    row.getCell(5).font = fontDados;
    // F, G, H, I -> vazios
    row.getCell(6).value = null;
    row.getCell(7).value = null;
    row.getCell(8).value = null;
    row.getCell(9).value = null;
  });

  // Aba 2: Base (referência padrão do Modelo.xlsx)
  const wsBase = wb.addWorksheet("Base");
  wsBase.columns = [
    { width: 19.7 },
    { width: 11.19 },
    { width: 11.19 },
    { width: 11.19 },
  ];
  const baseHeader = wsBase.getRow(2);
  baseHeader.height = 16.15;
  baseHeader.getCell(1).value = "Nome da Unidade";
  baseHeader.getCell(2).value = "ID";
  baseHeader.getCell(4).value = "UF";
  for (const c of [1, 2, 4]) {
    baseHeader.getCell(c).font = {
      name: "Helvetica Neue",
      size: 13,
      bold: true,
      color: { argb: "FF676A6C" },
    };
  }

  const maxRows = Math.max(UNIDADES_BASE_MODELO.length, UFS_BASE_MODELO.length);
  for (let i = 0; i < maxRows; i++) {
    const r = wsBase.getRow(i + 3);
    r.height = 15;
    if (i < UNIDADES_BASE_MODELO.length) {
      r.getCell(1).value = UNIDADES_BASE_MODELO[i][0];
      r.getCell(1).font = { name: "Arial", size: 10 };
      r.getCell(2).value = UNIDADES_BASE_MODELO[i][1];
      r.getCell(2).font = { name: "Arial", size: 10 };
    }
    if (i < UFS_BASE_MODELO.length) {
      r.getCell(4).value = UFS_BASE_MODELO[i];
      r.getCell(4).font = {
        name: "Helvetica Neue",
        size: 13,
        bold: true,
        color: { argb: "FF676A6C" },
      };
    }
  }

  const arrayBuffer = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function extrairTextoCelula(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "richText" in v && Array.isArray(v.richText)) {
    return v.richText.map((t) => t.text).join("").trim();
  }
  if (typeof v === "object" && "result" in v) {
    return String(v.result ?? "").trim();
  }
  return String(v).trim();
}

function extrairNumeroCelula(cell: ExcelJS.Cell): number {
  const v = cell.value;
  if (typeof v === "number") return v;
  if (v && typeof v === "object" && "result" in v && typeof v.result === "number") {
    return v.result;
  }
  const txt = extrairTextoCelula(cell)
    .replace(/R\$/gi, "")
    .trim();
  if (!txt) return 0;
  // Trata formato brasileiro "1.234,56" ou decimal "1234.56"
  if (txt.includes(",") && txt.includes(".")) {
    return Number(txt.replace(/\./g, "").replace(",", ".")) || 0;
  }
  if (txt.includes(",")) {
    return Number(txt.replace(",", ".")) || 0;
  }
  return Number(txt) || 0;
}

/**
 * Lê a planilha de Relatório de Cotação gerada pelo Sistema Banco de Preços
 * e extrai o Preço Estimado da Coluna E para cada item objeto do processo.
 */
export async function extrairCotacaoBancoPrecosXlsx(
  buffer: ArrayBuffer | Buffer,
): Promise<ResultadoImportacaoBancoPrecos> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as any);

  const ws = wb.getWorksheet("Relatório de Cotação") || wb.worksheets[0];
  if (!ws) {
    throw new Error("A planilha enviada não contém nenhuma aba válida.");
  }

  let responsavelNome: string | null = null;
  let responsavelMatricula: string | null = null;
  let periodoPesquisa: string | null = null;
  let relatorioGerado: string | null = null;
  let processoReferencia: string | null = null;
  let headerRowIdx: number | null = null;

  for (let r = 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const colA = extrairTextoCelula(row.getCell(1));
    const colB = extrairTextoCelula(row.getCell(2));
    const colE = extrairTextoCelula(row.getCell(5));

    if (colA.startsWith("Responsável:")) {
      responsavelNome = colA.replace("Responsável:", "").trim() || null;
    } else if (colA.startsWith("Matrícula:")) {
      responsavelMatricula = colA.replace("Matrícula:", "").trim() || null;
    } else if (colA.toLowerCase().startsWith("pesquisa realizada")) {
      periodoPesquisa = colA;
    } else if (colA.toLowerCase().startsWith("relatório gerado")) {
      relatorioGerado = colA;
    } else if (colA.toLowerCase().startsWith("processo sei")) {
      processoReferencia = colA;
    }

    if (
      colA.toLowerCase() === "item" &&
      (colB.toLowerCase().includes("nome") || colE.toLowerCase().includes("preço"))
    ) {
      headerRowIdx = r;
      break;
    }
  }

  const itensCotados: ItemImportadoBancoPrecos[] = [];

  const startRow = headerRowIdx ? headerRowIdx + 1 : 2;
  for (let r = startRow; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const colA = extrairTextoCelula(row.getCell(1));
    if (!colA) continue;
    if (colA.toLowerCase().includes("valor global")) break;

    const itemOrdem = Number(colA);
    if (!Number.isFinite(itemOrdem) || itemOrdem <= 0) continue;

    const nome = extrairTextoCelula(row.getCell(2));
    const precoEstimadoColE = extrairNumeroCelula(row.getCell(5));
    const quantidade = extrairNumeroCelula(row.getCell(8));
    const unidade = extrairTextoCelula(row.getCell(9)) || "Unidades";
    const total = extrairNumeroCelula(row.getCell(10));

    if (precoEstimadoColE > 0 || nome) {
      itensCotados.push({
        itemOrdem,
        nome,
        precoEstimadoColE,
        quantidade,
        unidade,
        total,
      });
    }
  }

  if (itensCotados.length === 0) {
    throw new Error(
      "Não foi possível localizar itens cotados com Preço Estimado na Coluna E da planilha enviada. Verifique se o arquivo é o Relatório de Cotação exportado pelo Banco de Preços.",
    );
  }

  return {
    responsavelNome,
    responsavelMatricula,
    periodoPesquisa,
    relatorioGerado,
    processoReferencia,
    itensCotados,
  };
}

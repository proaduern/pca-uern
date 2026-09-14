import ExcelJS from "exceljs";

export interface ResultadoImportacao {
  sucesso: number;
  erros: { linha: number; mensagem: string }[];
}

function detectarSeparadorCsv(texto: string): string {
  const primeiraLinha = texto.split(/\r?\n/, 1)[0] ?? "";
  const pontoEVirgula = (primeiraLinha.match(/;/g) ?? []).length;
  const virgula = (primeiraLinha.match(/,/g) ?? []).length;
  return pontoEVirgula > virgula ? ";" : ",";
}

/**
 * Parser CSV respeitando RFC4180: um campo entre aspas pode conter o próprio
 * separador (e até quebras de linha), e "" dentro de um campo entre aspas é
 * uma aspas literal escapada. Um split ingênuo por separador (a versão
 * anterior deste parser) quebra qualquer linha cujo campo tenha uma vírgula
 * dentro de aspas — comum em descrições de item longas — deslocando todas
 * as colunas seguintes daquela linha.
 */
function parseCsv(texto: string, separador: string): string[][] {
  const linhas: string[][] = [];
  let linhaAtual: string[] = [];
  let campo = "";
  let dentroDeAspas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentroDeAspas = false;
        }
      } else {
        campo += c;
      }
      continue;
    }
    if (c === '"') {
      dentroDeAspas = true;
    } else if (c === separador) {
      linhaAtual.push(campo);
      campo = "";
    } else if (c === "\r") {
      // ignorado — a quebra de linha real é tratada no \n (ou no fim do CRLF)
    } else if (c === "\n") {
      linhaAtual.push(campo);
      linhas.push(linhaAtual);
      linhaAtual = [];
      campo = "";
    } else {
      campo += c;
    }
  }
  if (campo !== "" || linhaAtual.length > 0) {
    linhaAtual.push(campo);
    linhas.push(linhaAtual);
  }

  return linhas.map((linha) => linha.map((valor) => valor.trim()));
}

function valorCelula(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") {
    const obj = v as { text?: unknown; result?: unknown };
    if (obj.text !== undefined) return String(obj.text).trim();
    if (obj.result !== undefined) return String(obj.result).trim();
    return "";
  }
  return String(v).trim();
}

async function carregarPrimeiraPlanilha(
  nomeArquivo: string,
  buffer: ArrayBuffer,
): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();

  if (nomeArquivo.toLowerCase().endsWith(".csv")) {
    const texto = new TextDecoder("utf-8").decode(buffer);
    const separador = detectarSeparadorCsv(texto);
    const planilha = workbook.addWorksheet("dados");
    for (const linhaValores of parseCsv(texto, separador)) {
      if (linhaValores.every((v) => v === "")) continue;
      planilha.addRow(linhaValores);
    }
    return planilha;
  }

  // exceljs vendoriza sua própria definição de tipo para Buffer, incompatível
  // com a do @types/node deste projeto (versões diferentes de lib.es2024) —
  // o cast é só para o type-checker; em runtime é um Buffer normal.
  await workbook.xlsx.load(Buffer.from(buffer) as never);
  const primeira = workbook.worksheets[0];
  if (!primeira) throw new Error("A planilha não tem nenhuma aba.");
  return primeira;
}

export interface LinhaPlanilha {
  linha: number;
  dados: Record<string, string>;
}

export async function lerPlanilha(
  nomeArquivo: string,
  buffer: ArrayBuffer,
): Promise<LinhaPlanilha[]> {
  const planilha = await carregarPrimeiraPlanilha(nomeArquivo, buffer);

  const cabecalho: string[] = [];
  const registros: LinhaPlanilha[] = [];

  planilha.eachRow((row, numeroLinha) => {
    const valores = (row.values as unknown[]).slice(1).map(valorCelula);
    if (numeroLinha === 1) {
      cabecalho.push(...valores);
      return;
    }
    if (valores.every((v) => v === "")) return;
    const dados: Record<string, string> = {};
    cabecalho.forEach((chave, indice) => {
      dados[chave] = valores[indice] ?? "";
    });
    registros.push({ linha: numeroLinha, dados });
  });

  return registros;
}

export interface LinhaPosicional {
  linha: number;
  valores: string[];
}

/**
 * Lê a planilha por posição de coluna (A, B, C…), ignorando o texto do
 * cabeçalho — para formatos de planilha legados em que a coluna é
 * identificada pela letra, não pelo nome. A linha 1 (cabeçalho) é sempre
 * pulada; os dados começam na linha 2.
 */
export async function lerPlanilhaPosicional(
  nomeArquivo: string,
  buffer: ArrayBuffer,
): Promise<LinhaPosicional[]> {
  const planilha = await carregarPrimeiraPlanilha(nomeArquivo, buffer);

  const registros: LinhaPosicional[] = [];
  planilha.eachRow((row, numeroLinha) => {
    if (numeroLinha === 1) return;
    const valores = (row.values as unknown[]).slice(1).map(valorCelula);
    if (valores.every((v) => v === "")) return;
    registros.push({ linha: numeroLinha, valores });
  });

  return registros;
}

export function paraBooleano(valor: string | undefined): boolean {
  const v = (valor ?? "").trim().toLowerCase();
  return v === "sim" || v === "true" || v === "verdadeiro" || v === "1" || v === "x";
}

export function paraNumero(valor: string | undefined): number {
  const limpo = (valor ?? "").toString().trim();
  if (!limpo) return 0;
  if (limpo.includes(",")) {
    return Number(limpo.replace(/\./g, "").replace(",", ".")) || 0;
  }
  return Number(limpo) || 0;
}

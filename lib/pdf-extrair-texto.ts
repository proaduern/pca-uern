// Importa o módulo interno diretamente (não o pacote raiz) — o index.js do
// pdf-parse roda um bloco de "modo debug" na avaliação do módulo que, sob
// bundlers como o Turbopack, tenta ler um PDF de teste do próprio pacote e
// quebra com ENOENT. Ver types/pdf-parse-lib.d.ts.
import pdfParse from "pdf-parse/lib/pdf-parse.js";

const TAMANHO_MAXIMO_BYTES = 15 * 1024 * 1024; // 15 MB

/** Extrai o texto de um PDF enviado pelo usuário — usado só como referência
 * de auditoria (o servidor confirma os valores manualmente); nunca alimenta
 * automaticamente um campo estruturado do formulário. */
export async function extrairTextoPdf(arquivo: File): Promise<string> {
  if (arquivo.type !== "application/pdf" && !arquivo.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Selecione um arquivo PDF.");
  }
  if (arquivo.size === 0) {
    throw new Error("O arquivo enviado está vazio.");
  }
  if (arquivo.size > TAMANHO_MAXIMO_BYTES) {
    throw new Error("O arquivo excede o limite de 15 MB.");
  }
  const buffer = Buffer.from(await arquivo.arrayBuffer());
  try {
    const dados = await pdfParse(buffer);
    return dados.text.trim();
  } catch {
    throw new Error("Não foi possível ler o PDF enviado — verifique se o arquivo não está corrompido.");
  }
}

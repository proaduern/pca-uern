/**
 * Regras de classificação da importação em lote de DFDs (planilha do PCA
 * consolidado), extraídas literalmente do sistema original — mesmas
 * palavras-chave, mesmos mapeamentos, mesmos padrões.
 */

/** Vários tipos de traço viram um hífen comum; espaços múltiplos viram um só. */
export function normalizarNomeCategoria(nome: string | null | undefined): string {
  return String(nome ?? "")
    .replace(/[‐‑‒–—―]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

const CATEGORIA_SERVICO_KEYWORDS_IMPORT = [
  "serviç",
  "terceiriz",
  "locação",
  "concessão",
  "manutenção",
  "água e esgoto",
  "energia elétrica",
  "dedetiz",
  "gerador",
  "fornecimento continuado",
  "seguro",
  "pagamento de taxas",
  "obra ou reforma",
  "biblioteca virtual",
  "descargas atmosféricas",
  "coffee break",
  "postais",
];

export function classificarTipoCategoriaImportacao(
  nomeCategoria: string,
): "SERVICO" | "MATERIAL" {
  const n = nomeCategoria.toLowerCase();
  return CATEGORIA_SERVICO_KEYWORDS_IMPORT.some((k) => n.includes(k)) ? "SERVICO" : "MATERIAL";
}

const CONSUMO_KEYWORDS_IMPORT = [
  "consumo",
  "expediente",
  "limpeza",
  "insumos",
  "copa",
  "cozinha",
  "alimentício",
  "alimento",
  "combustível",
];

export function classificarTipoBemImportacao(nomeCategoria: string): "CONSUMO" | "PERMANENTE" {
  const n = nomeCategoria.toLowerCase();
  return CONSUMO_KEYWORDS_IMPORT.some((k) => n.includes(k)) ? "CONSUMO" : "PERMANENTE";
}

const ORDEM_PRIORIDADE_IMPORT: Record<string, number> = {
  altíssima: 4,
  alta: 3,
  média: 2,
  media: 2,
  baixa: 1,
};

export function ordemPrioridadeImportacao(nivel: string): number {
  return ORDEM_PRIORIDADE_IMPORT[nivel.toLowerCase()] ?? 2;
}

/** Aceita "Alta, texto explicativo" — só o que vem antes da vírgula é o nível. */
export function extrairPrioridadeImportacao(texto: string | null | undefined): {
  nivel: string;
  frase: string;
} {
  if (!texto) return { nivel: "Média", frase: "Média" };
  const partes = String(texto).split(",");
  const nivelBruto = partes[0].trim();
  const nivel = nivelBruto ? nivelBruto.charAt(0).toUpperCase() + nivelBruto.slice(1).toLowerCase() : "Média";
  const frase = partes.slice(1).join(",").trim() || nivel;
  return { nivel, frase };
}

export function mapearEnquadramentoImportacao(fonte: string | null | undefined): "OP" | "GERAL" | "CONVENIO" {
  const f = String(fonte ?? "").toUpperCase().trim();
  if (f.startsWith("OP")) return "OP";
  if (f.includes("CONVÊNIO") || f.includes("CONVENIO")) return "CONVENIO";
  return "GERAL";
}

export function mapearNaturezaImportacao(modalidade: string | null | undefined): "RENOVACAO" | "NOVA" {
  const m = String(modalidade ?? "").toLowerCase();
  if (m.includes("renov")) return "RENOVACAO";
  return "NOVA";
}

/** Diárias/Passagens/Hospedagens agrupam só por unidade (fluxo contínuo), não por categoria. */
export const CATEGORIAS_FLUXO_MAP: Record<string, string> = {
  diárias: "Diárias",
  "passagens aéreas": "Passagens Aéreas",
  passagens: "Passagens Aéreas",
  hospedagens: "Hospedagens",
};

export function categoriaFluxoContinuo(categoriaNormalizada: string): string | null {
  return CATEGORIAS_FLUXO_MAP[categoriaNormalizada.toLowerCase()] ?? null;
}

import { arredondarCentavos } from "./cota";

const MODALIDADE_LABEL: Record<string, string> = {
  RENOVACAO: "Renovação Contratual",
  NOVA: "Contratação",
  FLUXO_CONTINUO: "Fluxo Contínuo",
};

export interface ItemDfdParaConsolidado {
  enquadramento: "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA";
  valorTotal: number;
  tipoDemanda: "RENOVACAO" | "NOVA" | "FLUXO_CONTINUO";
}

export interface ConsolidacaoParaLinha {
  categoriaNome: string;
  classificacaoRubrica: string | null;
  codigoPncp: string | null;
  itensDfd: ItemDfdParaConsolidado[];
  /** Itens adicionados pelo Setor Técnico (sem demandante/enquadramento próprio) — contam como Fonte 500. */
  valorItensTecnicos: number;
}

export interface LinhaConsolidado {
  classificacaoRubrica: string;
  modalidade: string;
  categoriaNome: string;
  convenio: number;
  recursosExtra: number;
  fonte500: number;
  total: number;
  codigoPncp: string | null;
}

/** Modalidade da linha: rótulo único se todos os itens do DFD concordam, "Diversos" se
 * a consolidação mistura tipos de demanda diferentes, "—" se não há item de DFD (só técnico). */
function modalidadeDaLinha(itens: ItemDfdParaConsolidado[]): string {
  const distintos = new Set(itens.map((it) => MODALIDADE_LABEL[it.tipoDemanda]));
  if (distintos.size === 0) return "—";
  if (distintos.size === 1) return [...distintos][0];
  return "Diversos";
}

export function montarLinhaConsolidado(c: ConsolidacaoParaLinha): LinhaConsolidado {
  let convenio = 0;
  let fonte500 = c.valorItensTecnicos;
  let recursosExtra = 0;
  for (const it of c.itensDfd) {
    if (it.enquadramento === "CONVENIO") convenio += it.valorTotal;
    else if (it.enquadramento === "RECURSOS_EXTRA") recursosExtra += it.valorTotal;
    else fonte500 += it.valorTotal;
  }
  return {
    classificacaoRubrica: c.classificacaoRubrica ?? "—",
    modalidade: modalidadeDaLinha(c.itensDfd),
    categoriaNome: c.categoriaNome,
    convenio: arredondarCentavos(convenio),
    recursosExtra: arredondarCentavos(recursosExtra),
    fonte500: arredondarCentavos(fonte500),
    total: arredondarCentavos(convenio + recursosExtra + fonte500),
    codigoPncp: c.codigoPncp,
  };
}

export interface TotaisConsolidado {
  convenio: number;
  recursosExtra: number;
  fonte500: number;
  total: number;
}

export function totaisConsolidado(linhas: LinhaConsolidado[]): TotaisConsolidado {
  return {
    convenio: arredondarCentavos(linhas.reduce((s, l) => s + l.convenio, 0)),
    recursosExtra: arredondarCentavos(linhas.reduce((s, l) => s + l.recursosExtra, 0)),
    fonte500: arredondarCentavos(linhas.reduce((s, l) => s + l.fonte500, 0)),
    total: arredondarCentavos(linhas.reduce((s, l) => s + l.total, 0)),
  };
}

export function todasComCodigoPncp(linhas: LinhaConsolidado[]): boolean {
  return linhas.every((l) => !!l.codigoPncp);
}

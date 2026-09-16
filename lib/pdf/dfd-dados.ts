import { brl, formatarData } from "../formato";

/** Ordem e rótulos exatos do modelo oficial "DFD - MODELO.docx" (seção 1). */
const ORIGEM_LABEL: Record<string, string> = {
  GERAL: "Recursos Ordinários – Uern Geral",
  RECURSOS_EXTRA: "Recursos arrecadados pela Unidade (Recursos Extra)",
  OP: "Recursos Ordinários – Orçamento Participativo",
  CONVENIO: "Recursos de Convênio(*)",
};
const ORDEM_ORIGEM = ["GERAL", "RECURSOS_EXTRA", "OP", "CONVENIO"] as const;

export interface ItemParaPdf {
  enquadramento: "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA";
  convenioNumero: string | null;
  convenioAno: number | null;
  parlamentarNome: string | null;
  recursoExtraAgencia: string | null;
  recursoExtraConta: string | null;
  categoriaNome: string;
  nome: string;
  quantidade: number | null;
  valorUnit: number | null;
  valorTotal: number;
}

export interface DfdParaPdf {
  numero: number;
  ano: number;
  unidadeNome: string;
  unidadeEmail: string;
  responsavelNome: string | null;
  responsavelMatricula: string | null;
  responsavelTelefone: string | null;
  tipificacaoNome: string | null;
  justificativa: string;
  tipoDemanda: "RENOVACAO" | "NOVA" | "FLUXO_CONTINUO";
  data: Date | null;
  prioridadeFrase: string;
  criadoEm: Date;
  itens: ItemParaPdf[];
}

export interface OrigemMarcada {
  label: string;
  marcada: boolean;
}

export function origensDoDfd(dfd: DfdParaPdf): OrigemMarcada[] {
  const presentes = new Set(dfd.itens.map((it) => it.enquadramento));
  return ORDEM_ORIGEM.map((chave) => ({ label: ORIGEM_LABEL[chave], marcada: presentes.has(chave) }));
}

export interface DetalheConvenio {
  identificacao: string;
  valorDemandado: string;
  autorEmenda: string | null;
}

/** Um bloco por combinação distinta de número/ano/parlamentar entre os itens de convênio do DFD. */
export function detalhesConvenio(dfd: DfdParaPdf): DetalheConvenio[] {
  const itensConvenio = dfd.itens.filter((it) => it.enquadramento === "CONVENIO");
  const grupos = new Map<string, { itens: ItemParaPdf[] }>();
  for (const it of itensConvenio) {
    const chave = `${it.convenioNumero ?? ""}|${it.convenioAno ?? ""}|${it.parlamentarNome ?? ""}`;
    const grupo = grupos.get(chave) ?? { itens: [] };
    grupo.itens.push(it);
    grupos.set(chave, grupo);
  }
  return [...grupos.values()].map((grupo) => {
    const [primeiro] = grupo.itens;
    const valorDemandado = grupo.itens.reduce((s, it) => s + it.valorTotal, 0);
    return {
      identificacao: `${primeiro.convenioNumero ?? "—"}/${primeiro.convenioAno ?? "—"}`,
      valorDemandado: brl(valorDemandado),
      autorEmenda: primeiro.parlamentarNome,
    };
  });
}

export interface DetalheRecursoExtra {
  agenciaConta: string;
  valorDemandado: string;
}

/** Um bloco por combinação distinta de agência/conta entre os itens de recursos extra do DFD. */
export function detalhesRecursoExtra(dfd: DfdParaPdf): DetalheRecursoExtra[] {
  const itensExtra = dfd.itens.filter((it) => it.enquadramento === "RECURSOS_EXTRA");
  const grupos = new Map<string, { itens: ItemParaPdf[] }>();
  for (const it of itensExtra) {
    const chave = `${it.recursoExtraAgencia ?? ""}|${it.recursoExtraConta ?? ""}`;
    const grupo = grupos.get(chave) ?? { itens: [] };
    grupo.itens.push(it);
    grupos.set(chave, grupo);
  }
  return [...grupos.values()].map((grupo) => {
    const [primeiro] = grupo.itens;
    const valorDemandado = grupo.itens.reduce((s, it) => s + it.valorTotal, 0);
    return {
      agenciaConta: `Agência: ${primeiro.recursoExtraAgencia ?? "—"} - Conta: ${primeiro.recursoExtraConta ?? "—"}`,
      valorDemandado: brl(valorDemandado),
    };
  });
}

export function categoriasDoDfd(dfd: DfdParaPdf): string[] {
  return [...new Set(dfd.itens.map((it) => it.categoriaNome))].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function totalDoDfd(dfd: DfdParaPdf): number {
  return dfd.itens.reduce((s, it) => s + it.valorTotal, 0);
}

export function tituloDataDfd(dfd: DfdParaPdf): string {
  return dfd.tipoDemanda === "RENOVACAO" ? "Data prevista de renovação" : "Data pretendida de entrega";
}

export function numeroFormatado(dfd: { numero: number; ano: number }): string {
  return `${String(dfd.numero).padStart(4, "0")}/${dfd.ano}`;
}

export { brl, formatarData };

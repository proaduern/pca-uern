/**
 * Motor de Execução (Fase 4), extraído do sistema original: roteamento de
 * categoria para subperfil (Obras/Serviços/Materiais e Patrimônio) e a
 * máquina de 4 status de um processo de execução.
 */

export type SubperfilExecucao = "OBRAS" | "SERVICOS" | "MATERIAIS_PATRIMONIO";

export const SUBPERFIL_EXECUCAO_LABEL: Record<SubperfilExecucao, string> = {
  OBRAS: "Unidade de Obras",
  SERVICOS: "Unidade de Serviços",
  MATERIAIS_PATRIMONIO: "Unidade de Materiais e Patrimônio",
};

/** Lista fixa do sistema original — nomes de categoria de serviço roteados por padrão à Unidade de Serviços. */
export const CATEGORIAS_SERVICO = [
  "Obra ou Serviço de Engenharia",
  "Serviço com dedicação exclusiva de mão de obra",
  "Serviço comum sem mão de obra exclusiva",
  "Capacitações",
  "Pagamento de Taxas ou Inscrições",
];

export function subperfilPadraoCategoria(categoriaNome: string): SubperfilExecucao {
  if (categoriaNome === "Obra ou Serviço de Engenharia") return "OBRAS";
  if (CATEGORIAS_SERVICO.includes(categoriaNome)) return "SERVICOS";
  return "MATERIAIS_PATRIMONIO";
}

export function subperfilEfetivoCategoria(
  categoriaNome: string,
  override: SubperfilExecucao | null | undefined,
): SubperfilExecucao {
  return override ?? subperfilPadraoCategoria(categoriaNome);
}

export type CampoStatusExecucao = "dataEnvio" | "prazoDias";

export type StatusExecucaoValor =
  | "REMETIDO_FORNECEDOR"
  | "REJEITADA_FORNECEDOR"
  | "RECEBIDA_CONFERENCIA"
  | "RECEBIDA_DEFINITIVO";

export interface StatusExecucaoInfo {
  value: StatusExecucaoValor;
  label: string;
  campos: CampoStatusExecucao[];
  proximos: StatusExecucaoValor[];
}

export const STATUS_EXECUCAO_OPCOES: StatusExecucaoInfo[] = [
  {
    value: "REMETIDO_FORNECEDOR",
    label: "Demanda Remetida ao Fornecedor",
    campos: ["dataEnvio", "prazoDias"],
    proximos: ["REJEITADA_FORNECEDOR", "RECEBIDA_CONFERENCIA"],
  },
  {
    value: "REJEITADA_FORNECEDOR",
    label: "Demanda Rejeitada pelo Fornecedor",
    campos: [],
    proximos: [],
  },
  {
    value: "RECEBIDA_CONFERENCIA",
    label: "Demanda Recebida, em Conferência",
    campos: [],
    proximos: ["RECEBIDA_DEFINITIVO"],
  },
  {
    value: "RECEBIDA_DEFINITIVO",
    label: "Demanda Recebida em Definitivo",
    campos: [],
    proximos: [],
  },
];

export function statusExecucaoInfo(value: StatusExecucaoValor): StatusExecucaoInfo | undefined {
  return STATUS_EXECUCAO_OPCOES.find((s) => s.value === value);
}

/**
 * Um processo recém-aberto ainda não tem nenhuma linha de StatusExecucao —
 * equivalente ao pseudo-status "processo_aberto" do sistema original, que
 * nunca fazia parte da máquina de próximos status (ver proximosStatusExecucao).
 */
export function statusExecucaoLabel(value: StatusExecucaoValor | null): string {
  if (!value) return "Processo de Execução Aberto";
  return statusExecucaoInfo(value)?.label ?? "—";
}

export function proximosStatusExecucao(statusAtual: StatusExecucaoValor | null): StatusExecucaoInfo[] {
  if (!statusAtual) return [STATUS_EXECUCAO_OPCOES[0]];
  const info = statusExecucaoInfo(statusAtual);
  if (!info || info.proximos.length === 0) return [];
  return STATUS_EXECUCAO_OPCOES.filter((o) => info.proximos.includes(o.value));
}

/** "Em atraso pelo fornecedor": só se aplica enquanto o status atual for remetido_fornecedor. */
export function calcularAtrasoExecucao(
  statusAtual: StatusExecucaoValor | null,
  dataEnvio: Date | null,
  prazoDias: number | null,
): boolean {
  if (statusAtual !== "REMETIDO_FORNECEDOR" || !dataEnvio || !prazoDias) return false;
  const limite = new Date(dataEnvio);
  limite.setDate(limite.getDate() + prazoDias);
  return new Date() > limite;
}

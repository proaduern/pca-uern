/**
 * Motor de Licitações (Fase 3), extraído do sistema original: máquina de 13
 * status (STATUS_LICITACAO_OPCOES), e o agrupamento/homologação por item.
 */

export type StatusLicitacaoValor =
  | "PESQUISA_PRECOS"
  | "TERMO_REFERENCIA"
  | "DILIGENCIA_DEMANDANTE"
  | "MINUTAS"
  | "ANALISE_JURIDICA"
  | "DILIGENCIAS_PGE"
  | "SESSAO_MARCADA"
  | "ANALISE_PROPOSTAS"
  | "RECURSO"
  | "HOMOLOGADO"
  | "ASSINATURA_CONTRATO"
  | "REMETIDO_EXECUCAO"
  | "REMETIDO_GESTOR_ATA";

export type CampoStatusLicitacao =
  | "responsavel"
  | "dataDiligencia"
  | "prazoResposta"
  | "dataSessao"
  | "agenteNome"
  | "agenteMatricula";

export interface StatusLicitacaoInfo {
  value: StatusLicitacaoValor;
  label: string;
  campos: CampoStatusLicitacao[];
  proximos: StatusLicitacaoValor[];
  intercorrencia?: boolean;
}

export const STATUS_LICITACAO_OPCOES: StatusLicitacaoInfo[] = [
  {
    value: "PESQUISA_PRECOS",
    label: "Em Pesquisa de Preços",
    campos: ["responsavel"],
    proximos: ["TERMO_REFERENCIA"],
  },
  {
    value: "TERMO_REFERENCIA",
    label: "Em Elaboração de Termo de Referência",
    campos: ["responsavel"],
    proximos: ["DILIGENCIA_DEMANDANTE", "MINUTAS"],
  },
  {
    value: "DILIGENCIA_DEMANDANTE",
    label: "Em Diligência ao Demandante",
    campos: ["dataDiligencia", "prazoResposta"],
    proximos: ["DILIGENCIA_DEMANDANTE", "MINUTAS"],
    intercorrencia: true,
  },
  {
    value: "MINUTAS",
    label: "Em Elaboração de Minutas de Contrato/Ata/Edital",
    campos: ["responsavel"],
    proximos: ["ANALISE_JURIDICA"],
  },
  {
    value: "ANALISE_JURIDICA",
    label: "Em Análise Jurídica",
    campos: [],
    proximos: ["DILIGENCIAS_PGE", "SESSAO_MARCADA"],
  },
  {
    value: "DILIGENCIAS_PGE",
    label: "Em Cumprimento de Diligências da PGE",
    campos: [],
    proximos: ["DILIGENCIAS_PGE", "SESSAO_MARCADA"],
    intercorrencia: true,
  },
  {
    value: "SESSAO_MARCADA",
    label: "Sessão Marcada — Início da Fase Externa",
    campos: ["dataSessao", "agenteNome", "agenteMatricula"],
    proximos: ["ANALISE_PROPOSTAS"],
  },
  {
    value: "ANALISE_PROPOSTAS",
    label: "Em Análise de Propostas",
    campos: [],
    proximos: ["RECURSO", "HOMOLOGADO"],
  },
  {
    value: "RECURSO",
    label: "Em Recurso",
    campos: [],
    proximos: ["RECURSO", "HOMOLOGADO"],
    intercorrencia: true,
  },
  {
    value: "HOMOLOGADO",
    label: "Certame Homologado",
    campos: [],
    proximos: ["ASSINATURA_CONTRATO"],
  },
  {
    value: "ASSINATURA_CONTRATO",
    label: "Em Assinatura de Contrato/Ata",
    campos: [],
    proximos: ["REMETIDO_EXECUCAO", "REMETIDO_GESTOR_ATA"],
  },
  {
    value: "REMETIDO_EXECUCAO",
    label: "Encaminhado para Execução",
    campos: [],
    proximos: [],
  },
  {
    value: "REMETIDO_GESTOR_ATA",
    label: "Remetido ao Gestor de Ata (Registro de Preços)",
    campos: [],
    proximos: [],
  },
];

export function statusLicitacaoInfo(value: StatusLicitacaoValor): StatusLicitacaoInfo | undefined {
  return STATUS_LICITACAO_OPCOES.find((s) => s.value === value);
}

export function statusLicitacaoLabel(value: StatusLicitacaoValor): string {
  return statusLicitacaoInfo(value)?.label ?? "—";
}

/**
 * Próximos status disponíveis a partir do status atual (null = ainda não
 * começou). Em "assinatura_contrato", o único caminho disponível é travado
 * pelo tipoContratacao já definido na consolidação pelo Setor Técnico.
 */
export function proximosStatusLicitacao(
  statusAtual: StatusLicitacaoValor | null,
  tipoContratacao: "NORMAL" | "ATA",
): StatusLicitacaoInfo[] {
  if (!statusAtual) return [STATUS_LICITACAO_OPCOES[0]];
  if (statusAtual === "REMETIDO_GESTOR_ATA") return [];
  const info = statusLicitacaoInfo(statusAtual);
  if (!info || info.proximos.length === 0) return [];
  let opcoes = STATUS_LICITACAO_OPCOES.filter((o) => info.proximos.includes(o.value));
  if (statusAtual === "ASSINATURA_CONTRATO") {
    opcoes = opcoes.filter((o) =>
      tipoContratacao === "ATA" ? o.value === "REMETIDO_GESTOR_ATA" : o.value === "REMETIDO_EXECUCAO",
    );
  }
  return opcoes;
}

// ---------------------------------------------------------------------------
// Homologação por item — agrupamento e homologação parcial (prioriza OP)
// ---------------------------------------------------------------------------

export interface ItemHomologavel {
  id: string;
  origem: "DFD" | "TECNICO";
  nome: string;
  unidadeNome: string | null;
  enquadramento: "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA" | null;
  tipo: "MATERIAL" | "SERVICO";
  modoServico: "OBJETO" | "VALOR" | "ITENS";
  categoriaNome: string;
  quantidade: number;
  valorUnit: number;
  valorTotal: number;
}

export interface GrupoHomologacaoItem {
  nome: string;
  itens: ItemHomologavel[];
  quantidadeTotal: number;
  quantidadeOP: number;
}

/** Materiais e serviços em modo "itens", agrupados por nome — OP sempre primeiro dentro do grupo. */
export function agruparItensParaHomologacao(pendentes: ItemHomologavel[]): GrupoHomologacaoItem[] {
  const elegiveis = pendentes.filter(
    (it) => it.tipo === "MATERIAL" || (it.tipo === "SERVICO" && it.modoServico === "ITENS"),
  );
  const grupos = new Map<string, ItemHomologavel[]>();
  for (const it of elegiveis) {
    const lista = grupos.get(it.nome) ?? [];
    lista.push(it);
    grupos.set(it.nome, lista);
  }
  return [...grupos.entries()].map(([nome, itens]) => {
    const ordenados = [...itens].sort(
      (a, b) => (a.enquadramento === "OP" ? 0 : 1) - (b.enquadramento === "OP" ? 0 : 1),
    );
    return {
      nome,
      itens: ordenados,
      quantidadeTotal: ordenados.reduce((s, it) => s + it.quantidade, 0),
      quantidadeOP: ordenados.filter((it) => it.enquadramento === "OP").reduce((s, it) => s + it.quantidade, 0),
    };
  });
}

export interface GrupoHomologacaoServicoValor {
  nome: string;
  itens: ItemHomologavel[];
  valorTotal: number;
}

/** Serviços em modo "valor" (ex.: Diárias/Passagens/Hospedagens), agrupados por categoria — sem fracionamento. */
export function agruparServicosValorPorCategoria(pendentes: ItemHomologavel[]): GrupoHomologacaoServicoValor[] {
  const elegiveis = pendentes.filter((it) => it.tipo === "SERVICO" && it.modoServico === "VALOR");
  const grupos = new Map<string, ItemHomologavel[]>();
  for (const it of elegiveis) {
    const lista = grupos.get(it.categoriaNome) ?? [];
    lista.push(it);
    grupos.set(it.categoriaNome, lista);
  }
  return [...grupos.entries()].map(([nome, itens]) => ({
    nome,
    itens,
    valorTotal: itens.reduce((s, it) => s + it.valorTotal, 0),
  }));
}

/** Serviços em modo "objeto livre" — cada um é seu próprio objeto de licitação, nunca agrupado. */
export function servicosPendentesHomologacao(pendentes: ItemHomologavel[]): ItemHomologavel[] {
  return pendentes.filter((it) => it.tipo === "SERVICO" && it.modoServico === "OBJETO");
}

export interface AlocacaoHomologacao {
  itemId: string;
  origem: "DFD" | "TECNICO";
  quantidadeIncluida: number;
}

/**
 * Corte automático de homologação parcial: percorre o grupo (já vem com OP
 * primeiro) e vai completando a quantidade homologada. Só é chamada quando
 * a quantidade cobre todos os itens OP do grupo — caso contrário, a
 * alocação precisa ser manual (ver confirmarHomologacaoManualAction).
 */
export function planejarHomologacaoParcialAutomatica(
  grupo: GrupoHomologacaoItem,
  quantidadeHomologada: number,
): AlocacaoHomologacao[] {
  let restante = quantidadeHomologada;
  const alocacoes: AlocacaoHomologacao[] = [];
  for (const it of grupo.itens) {
    if (restante <= 0) break;
    const incluida = Math.min(restante, it.quantidade);
    alocacoes.push({ itemId: it.id, origem: it.origem, quantidadeIncluida: incluida });
    restante -= incluida;
  }
  return alocacoes;
}

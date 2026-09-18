/**
 * Resolve a fase atual de um item de DFD, percorrendo todo o pipeline
 * institucional: consolidação técnica -> licitação -> execução -> (material)
 * entrega -> confirmação do demandante. Equivalente a
 * resolverFaseItemPipeline/resolverFaseViaEntrega/construirTimelineItem do
 * sistema original.
 *
 * `resolverFaseItemDfd` é a visão do DEMANDANTE: aplica antes os atalhos de
 * Troca de Item (OP) e Atendimento por Estoque (Fase 5) — um item trocado ou
 * atendido por estoque não segue mais o pipeline normal para quem pediu.
 * `resolverFaseItemPipelineDfd` é a fase REAL (ignora esses atalhos), usada
 * só no acompanhamento da PROAD dos itens em "estoque geral", que conta como
 * execução do PCA mesmo sem destinatário específico.
 */
import { prisma } from "./prisma";
import { statusLicitacaoLabel } from "./licitacao";
import { calcularAtrasoExecucao, statusExecucaoLabel } from "./execucao";
import { confirmacaoEfetiva, statusEntregaLabel, type StatusConfirmacaoEntrega, type StatusEntregaValor } from "./entrega";
import { brl, formatarDataHora } from "./formato";

export interface FaseItem {
  label: string;
  badge: "ok" | "warn" | "danger" | "neutral";
  executado: boolean;
  entregaId?: string;
  aguardaConfirmacao?: boolean;
  prazoConfirmacao?: string;
  viaEstoque?: boolean;
  viaTrocaOP?: boolean;
  trocaConcluida?: boolean;
}

export async function resolverFaseItemDfd(itemId: string): Promise<FaseItem> {
  const item = await prisma.itemDfd.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      categoria: true,
      trocaOP: true,
      atendimentoEstoque: { include: { entrega: { include: { statusEntrega: { orderBy: { createdAt: "desc" }, take: 1 }, confirmacoes: { orderBy: { createdAt: "desc" }, take: 1 } } } } },
      entrega: { include: { statusEntrega: { orderBy: { createdAt: "desc" }, take: 1 }, confirmacoes: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });

  // Item B (novo, criado por uma troca autorizada): já nasce com entrega
  // própria (autorizada de imediato) — nunca passa pelo pipeline normal.
  if (item.viaTrocaOP) {
    if (item.entrega) {
      return { ...resolverFaseViaEntrega(item.entrega), viaEstoque: true, viaTrocaOP: true };
    }
    return { label: "Troca de Item — Aguardando Providências", badge: "neutral", executado: false };
  }

  // Item A (original): uma vez trocado, deixa de contar para o demandante —
  // quem passa a valer é o item B, que aparece como sua própria linha.
  if (item.trocaOP && item.trocaOP.status === "APROVADO") {
    return { label: "Trocado por Outro Item (Troca de Item OP)", badge: "neutral", executado: false, trocaConcluida: true };
  }

  if (item.atendimentoEstoque?.status === "APROVADO" && item.atendimentoEstoque.entrega) {
    return { ...resolverFaseViaEntrega(item.atendimentoEstoque.entrega), viaEstoque: true };
  }

  return resolverFaseItemPipelineDfd(itemId);
}

function resolverFaseViaEntrega(entrega: {
  id: string;
  statusEntrega: { status: StatusEntregaValor }[];
  confirmacoes: { status: StatusConfirmacaoEntrega; dataLimite: Date }[];
}): FaseItem {
  const stEnt = entrega.statusEntrega[0] ?? null;
  if (!stEnt || stEnt.status !== "ENTREGUE") {
    return { label: `Entrega de Bens: ${statusEntregaLabel(stEnt?.status ?? null)}`, badge: "warn", executado: false, entregaId: entrega.id };
  }
  const confirmacao = entrega.confirmacoes[0] ?? null;
  if (!confirmacao) {
    return { label: "Entregue", badge: "ok", executado: true, entregaId: entrega.id };
  }
  const efetiva = confirmacaoEfetiva(confirmacao.status, confirmacao.dataLimite);
  const base = { entregaId: entrega.id };
  if (efetiva === "PENDENTE") {
    return {
      ...base,
      label: "Entregue — Aguardando sua Confirmação",
      badge: "warn",
      executado: false,
      aguardaConfirmacao: true,
      prazoConfirmacao: confirmacao.dataLimite.toISOString(),
    };
  }
  if (efetiva === "CONFIRMADO") {
    return { ...base, label: "Concluído — Entrega Confirmada por Você", badge: "ok", executado: true };
  }
  if (efetiva === "AUTO_CONFIRMADO") {
    return { ...base, label: "Concluído — Aceite Automático (prazo de 10 dias expirado)", badge: "ok", executado: true };
  }
  if (efetiva === "CONTESTACAO_PENDENTE_ENTREGA") {
    return { ...base, label: "Contestação em Análise pela Unidade de Entrega de Bens", badge: "warn", executado: false };
  }
  if (efetiva === "CONTESTACAO_PENDENTE_ADMIN") {
    return { ...base, label: "Contestação em Análise pela Administração", badge: "warn", executado: false };
  }
  if (efetiva === "CONTESTACAO_REJEITADA") {
    return { ...base, label: "Concluído — Entrega Confirmada (contestação não acolhida)", badge: "ok", executado: true };
  }
  return { ...base, label: "Entregue", badge: "ok", executado: true };
}

export async function resolverFaseItemPipelineDfd(itemId: string): Promise<FaseItem> {
  const item = await prisma.itemDfd.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      categoria: true,
      consolidacaoTecnica: { include: { statusLicitacao: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });

  if (item.categoria.fluxoContinuo) {
    return { label: "Concluído — Fluxo Contínuo", badge: "ok", executado: true };
  }

  if (!item.consolidacaoTecnicaId || !item.consolidacaoTecnica) {
    return { label: "Aguardando Consolidação pelo Setor Técnico", badge: "neutral", executado: false };
  }
  const stLic = item.consolidacaoTecnica.statusLicitacao[0];
  if (!stLic) {
    return { label: "Consolidado — Aguardando Início da Licitação", badge: "neutral", executado: false };
  }

  if (!item.resultadoHomologacao) {
    return {
      label: `Em Licitação: ${statusLicitacaoLabel(stLic.status)}`,
      badge: "warn",
      executado: false,
    };
  }
  if (item.resultadoHomologacao === "FRACASSADO") {
    return { label: "Licitação: Item Fracassado", badge: "danger", executado: false };
  }
  if (item.resultadoHomologacao === "DESERTO") {
    return { label: "Licitação: Item Deserto", badge: "danger", executado: false };
  }

  // resultadoHomologacao === "SUCESSO" -> segue para execução
  const proc = item.processoExecucaoId
    ? await prisma.processoExecucao.findUnique({
        where: { id: item.processoExecucaoId },
        include: { statusExecucao: { orderBy: { createdAt: "desc" }, take: 1 } },
      })
    : null;
  if (!proc) {
    return {
      label: "Homologado com Êxito — Aguardando Abertura de Processo de Execução",
      badge: "warn",
      executado: false,
    };
  }

  const stExec = proc.statusExecucao[0] ?? null;
  if (stExec?.status === "REJEITADA_FORNECEDOR") {
    return { label: "Execução: Rejeitada pelo Fornecedor", badge: "danger", executado: false };
  }
  if (!stExec || stExec.status !== "RECEBIDA_DEFINITIVO") {
    const atraso = calcularAtrasoExecucao(stExec?.status ?? null, stExec?.dataEnvio ?? null, stExec?.prazoDias ?? null);
    return {
      label: `Execução: ${statusExecucaoLabel(stExec?.status ?? null)}${atraso ? " — Em atraso pelo fornecedor" : ""}`,
      badge: atraso ? "danger" : "warn",
      executado: false,
    };
  }

  // recebida_definitivo
  if (item.tipo === "SERVICO") {
    return { label: "Concluído — Serviço Recebido em Definitivo", badge: "ok", executado: true };
  }

  // material: verifica entrega de bens
  const entrega = await prisma.entrega.findUnique({
    where: { itemDfdId: item.id },
    include: {
      statusEntrega: { orderBy: { createdAt: "desc" }, take: 1 },
      confirmacoes: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!entrega) {
    return { label: "Recebido pela Execução — Aguardando Autorização da PROAD", badge: "warn", executado: false };
  }
  return resolverFaseViaEntrega(entrega);
}

export interface EventoTimeline {
  data: string;
  titulo: string;
  desc: string;
}

/** Reconstrói a timeline cronológica completa de um item, percorrendo todas as etapas já registradas. */
export async function construirTimelineItemDfd(itemId: string): Promise<EventoTimeline[]> {
  const entregaInclude = { statusEntrega: { orderBy: { createdAt: "asc" as const } }, confirmacoes: { orderBy: { createdAt: "asc" as const } } };
  const item = await prisma.itemDfd.findUniqueOrThrow({
    where: { id: itemId },
    include: {
      dfd: true,
      consolidacaoTecnica: {
        include: { statusLicitacao: { orderBy: { createdAt: "asc" } }, estudoTecnicoPreliminar: true },
      },
      processoExecucao: { include: { statusExecucao: { orderBy: { createdAt: "asc" } } } },
      entrega: { include: entregaInclude },
      atendimentoEstoque: { include: { entrega: { include: entregaInclude } } },
    },
  });

  const eventos: EventoTimeline[] = [];
  eventos.push({ data: item.dfd.createdAt.toISOString(), titulo: "DFD Criado pela Unidade", desc: item.dfd.descricaoSumaria });
  if (item.dfd.aprovadoEm) {
    eventos.push({ data: item.dfd.aprovadoEm.toISOString(), titulo: "DFD Aprovado pela PROAD", desc: "" });
  }

  if (item.atendimentoEstoque) {
    eventos.push({
      data: item.atendimentoEstoque.solicitadoEm.toISOString(),
      titulo: "Unidade de Patrimônio propôs atendimento imediato por estoque",
      desc: "",
    });
    if (item.atendimentoEstoque.status === "APROVADO" && item.atendimentoEstoque.analisadoEm) {
      eventos.push({
        data: item.atendimentoEstoque.analisadoEm.toISOString(),
        titulo: "PROAD autorizou o atendimento por estoque",
        desc: "O item original consolidado segue seu próprio fluxo, agora como estoque geral.",
      });
    }
  }

  const cons = item.consolidacaoTecnica;
  if (cons) {
    eventos.push({
      data: cons.createdAt.toISOString(),
      titulo: "Consolidado pelo Setor Técnico",
      desc: `Processo SEI ${cons.processoSEI}`,
    });
    if (cons.estudoTecnicoPreliminar?.finalizadoEm) {
      eventos.push({
        data: cons.estudoTecnicoPreliminar.finalizadoEm.toISOString(),
        titulo: "Estudo Técnico Preliminar finalizado pelo Setor Técnico",
        desc: "",
      });
    }
    for (const h of cons.statusLicitacao) {
      eventos.push({ data: h.createdAt.toISOString(), titulo: `Licitação: ${statusLicitacaoLabel(h.status)}`, desc: "" });
    }
    if (item.resultadoHomologacao) {
      const ultimoStatus = cons.statusLicitacao[cons.statusLicitacao.length - 1];
      const resultadoLabel =
        item.resultadoHomologacao === "SUCESSO" ? "Sucesso" : item.resultadoHomologacao === "FRACASSADO" ? "Fracassado" : "Deserto";
      eventos.push({
        data: (ultimoStatus?.createdAt ?? cons.createdAt).toISOString(),
        titulo: `Resultado do Item: ${resultadoLabel}`,
        desc: item.resultadoHomologacao === "SUCESSO" && item.valorAdjudicado != null ? `Valor adjudicado: ${brl(item.valorAdjudicado)}` : "",
      });
    }
  }

  const proc = item.processoExecucao;
  if (proc) {
    for (const h of proc.statusExecucao) {
      eventos.push({
        data: h.createdAt.toISOString(),
        titulo: `Execução: ${statusExecucaoLabel(h.status)}`,
        desc: h.prazoDias ? `Prazo contratual: ${h.prazoDias} dias` : "",
      });
    }
  }

  const ent = item.entrega ?? item.atendimentoEstoque?.entrega ?? null;
  if (ent) {
    for (const h of ent.statusEntrega) {
      eventos.push({ data: h.createdAt.toISOString(), titulo: `Entrega de Bens: ${statusEntregaLabel(h.status as StatusEntregaValor)}`, desc: "" });
    }
    for (const c of ent.confirmacoes) {
      if (c.confirmadoEm) {
        eventos.push({ data: c.confirmadoEm.toISOString(), titulo: "Você confirmou o recebimento", desc: "" });
      }
      if (c.contestacaoSolicitadoEm) {
        eventos.push({ data: c.contestacaoSolicitadoEm.toISOString(), titulo: "Você contestou a entrega", desc: c.contestacaoMotivo ?? "" });
      }
      if (c.contestacaoAnaliseEntregaEm) {
        eventos.push({
          data: c.contestacaoAnaliseEntregaEm.toISOString(),
          titulo: `Unidade de Entrega de Bens: ${c.contestacaoAnaliseEntregaOk ? "aprovou a contestação" : "indeferiu a contestação"}`,
          desc: c.contestacaoAnaliseEntregaComentario ?? "",
        });
      }
      if (c.contestacaoAnaliseAdminEm) {
        eventos.push({
          data: c.contestacaoAnaliseAdminEm.toISOString(),
          titulo: `Administração: ${c.contestacaoAnaliseAdminOk ? "ratificou a contestação" : "não ratificou a contestação"}`,
          desc: "",
        });
      }
    }
  }

  return eventos.sort((a, b) => a.data.localeCompare(b.data)).map((e) => ({ ...e, data: formatarDataHora(new Date(e.data)) }));
}

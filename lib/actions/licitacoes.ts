"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirLicitacoes, obterSessao } from "@/lib/auth";
import {
  agruparItensParaHomologacao,
  agruparServicosValorPorCategoria,
  planejarHomologacaoParcialAutomatica,
  proximosStatusLicitacao,
  servicosPendentesHomologacao,
  type CampoStatusLicitacao,
  type GrupoHomologacaoItem,
  type ItemHomologavel,
  type StatusLicitacaoValor,
} from "@/lib/licitacao";
import { avancarStatusLicitacaoSeNecessario } from "./avancar-status";

async function obterConsolidacaoOuErro(consolidacaoId: string) {
  const consolidacao = await prisma.consolidacaoTecnica.findUnique({ where: { id: consolidacaoId } });
  if (!consolidacao) throw new Error("Processo de consolidação não encontrado.");
  return consolidacao;
}

/** Registro do resultado de homologação item a item pode ser feito por
 * Licitações ou pelo Agente de Contratação designado para este processo
 * específico (ver designarAgenteContratacaoAction) — as demais ações desta
 * unidade (status do processo, revisão de prioridade/prazo) continuam
 * restritas só a Licitações. */
async function exigirAcessoHomologacao(consolidacao: { agenteContratacaoDesignadoId: string | null }) {
  const sessao = await obterSessao();
  if (!sessao) throw new Error("Não autenticado.");
  if (sessao.tipo === "LICITACOES" || sessao.tipo === "ADMIN") return sessao;
  if (sessao.tipo === "AGENTE_CONTRATACAO" && sessao.id === consolidacao.agenteContratacaoDesignadoId) {
    return sessao;
  }
  throw new Error("Acesso restrito à unidade de licitações ou ao Agente de Contratação designado para este processo.");
}

/** Licitações designa (ou remove) o Agente de Contratação responsável por
 * conduzir o certame deste processo — enquanto designado, ele também passa
 * a poder registrar os resultados de homologação item a item. */
export async function designarAgenteContratacaoAction(consolidacaoId: string, formData: FormData) {
  await exigirLicitacoes();
  await obterConsolidacaoOuErro(consolidacaoId);

  const agenteContratacaoId = String(formData.get("agenteContratacaoId") ?? "").trim() || null;
  if (agenteContratacaoId) {
    const agente = await prisma.agenteContratacao.findUnique({ where: { id: agenteContratacaoId } });
    if (!agente || !agente.ativo) throw new Error("Agente de Contratação inválido ou inativo.");
  }

  await prisma.consolidacaoTecnica.update({
    where: { id: consolidacaoId },
    data: { agenteContratacaoDesignadoId: agenteContratacaoId },
  });

  revalidatePath(`/licitacoes/${consolidacaoId}`);
  revalidatePath("/");
}

async function statusAtualDaConsolidacao(consolidacaoId: string): Promise<StatusLicitacaoValor | null> {
  const ultimo = await prisma.statusLicitacao.findFirst({
    where: { consolidacaoId },
    orderBy: { createdAt: "desc" },
  });
  return ultimo?.status ?? null;
}

/** Itens (DFD + Técnico) da consolidação ainda sem resultado de homologação, no formato genérico usado pelo agrupamento. */
async function itensPendentesHomologacao(consolidacaoId: string): Promise<ItemHomologavel[]> {
  const [itensDfd, itensTecnicos] = await Promise.all([
    prisma.itemDfd.findMany({
      where: { consolidacaoTecnicaId: consolidacaoId, resultadoHomologacao: null },
      include: { dfd: { include: { unidade: true } }, categoria: true },
    }),
    prisma.itemTecnico.findMany({
      where: { consolidacaoTecnicaId: consolidacaoId, resultadoHomologacao: null },
      include: { categoria: true },
    }),
  ]);

  return [
    ...itensDfd.map(
      (it): ItemHomologavel => ({
        id: it.id,
        origem: "DFD",
        nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
        unidadeNome: it.dfd.unidade.nome,
        enquadramento: it.enquadramento,
        tipo: it.tipo,
        modoServico: it.categoria.modoServico,
        categoriaNome: it.categoria.nome,
        quantidade: Number(it.quantidade ?? 1),
        valorUnit: Number(it.valorUnit ?? 0),
        valorTotal: Number(it.valorTotal),
      }),
    ),
    ...itensTecnicos.map(
      (it): ItemHomologavel => ({
        id: it.id,
        origem: "TECNICO",
        nome: it.item,
        unidadeNome: null,
        enquadramento: null,
        tipo: it.categoria.tipo,
        modoServico: it.categoria.modoServico,
        categoriaNome: it.categoria.nome,
        quantidade: Number(it.quantidade),
        valorUnit: Number(it.valorUnit),
        valorTotal: Number(it.valorTotal),
      }),
    ),
  ];
}

/** Ao lançar um resultado de homologação, se não sobrar nenhum item pendente
 * e o status ainda estiver em HOMOLOGADO, avança automaticamente para
 * ASSINATURA_CONTRATO — a designação do certame como homologado continua
 * um ato deliberado de Licitações (registrarStatusLicitacaoAction), só o
 * próximo passo depois de encerrado o lançamento item a item é automático. */
async function avancarStatusAposHomologacaoCompleta(consolidacaoId: string): Promise<void> {
  const statusAtual = await statusAtualDaConsolidacao(consolidacaoId);
  if (statusAtual !== "HOMOLOGADO") return;
  const pendentes = await itensPendentesHomologacao(consolidacaoId);
  if (pendentes.length > 0) return;
  await avancarStatusLicitacaoSeNecessario(consolidacaoId, "ASSINATURA_CONTRATO");
}

/** Aplica o mesmo resultado (fracassado/deserto/sucesso sem fracionar) a todos os itens de um grupo. */
async function aplicarResultadoUniforme(
  itens: ItemHomologavel[],
  resultado: "SUCESSO" | "FRACASSADO" | "DESERTO",
  valorUnitario: number | null,
) {
  await prisma.$transaction(
    itens.map((it) => {
      const data = {
        resultadoHomologacao: resultado,
        valorAdjudicado: resultado === "SUCESSO" ? valorUnitario! * it.quantidade : null,
      };
      return it.origem === "DFD"
        ? prisma.itemDfd.update({ where: { id: it.id }, data })
        : prisma.itemTecnico.update({ where: { id: it.id }, data });
    }),
  );
}

/**
 * Divide um item por quantidade: a parte incluída vira uma nova linha (já
 * com o resultado da homologação lançado), o item de origem fica reduzido
 * ao restante, ainda pendente — nunca perde a ligação com a consolidação.
 * Equivalente ao dividirItem do sistema original, mas sem precisar de um
 * array itensIds manual: a nova linha já nasce com o mesmo consolidacaoTecnicaId.
 */
async function dividirEHomologarItem(
  origem: "DFD" | "TECNICO",
  itemId: string,
  quantidadeIncluida: number,
  valorUnitario: number,
) {
  if (origem === "DFD") {
    const original = await prisma.itemDfd.findUniqueOrThrow({ where: { id: itemId } });
    const valorUnit = Number(original.valorUnit ?? 0);
    const quantidadeRestante = Number(original.quantidade ?? 1) - quantidadeIncluida;
    await prisma.$transaction([
      prisma.itemDfd.update({
        where: { id: itemId },
        data: { quantidade: quantidadeRestante, valorTotal: valorUnit * quantidadeRestante },
      }),
      prisma.itemDfd.create({
        data: {
          dfdId: original.dfdId,
          tipo: original.tipo,
          enquadramento: original.enquadramento,
          categoriaId: original.categoriaId,
          itemCatalogoNome: original.itemCatalogoNome,
          itemNomeLivre: original.itemNomeLivre,
          tipoBem: original.tipoBem,
          quantidade: quantidadeIncluida,
          valorUnit: original.valorUnit,
          valorTotal: valorUnit * quantidadeIncluida,
          correlacao: original.correlacao,
          consolidacaoTecnicaId: original.consolidacaoTecnicaId,
          itemOrigemDivisaoId: itemId,
          resultadoHomologacao: "SUCESSO",
          valorAdjudicado: valorUnitario * quantidadeIncluida,
        },
      }),
    ]);
  } else {
    const original = await prisma.itemTecnico.findUniqueOrThrow({ where: { id: itemId } });
    const valorUnit = Number(original.valorUnit);
    const quantidadeRestante = Number(original.quantidade) - quantidadeIncluida;
    await prisma.$transaction([
      prisma.itemTecnico.update({
        where: { id: itemId },
        data: { quantidade: quantidadeRestante, valorTotal: valorUnit * quantidadeRestante },
      }),
      prisma.itemTecnico.create({
        data: {
          categoriaId: original.categoriaId,
          item: original.item,
          valorUnit: original.valorUnit,
          quantidade: quantidadeIncluida,
          valorTotal: valorUnit * quantidadeIncluida,
          tipoBem: original.tipoBem,
          correlacao: original.correlacao,
          criadoPorId: original.criadoPorId,
          consolidacaoTecnicaId: original.consolidacaoTecnicaId,
          itemOrigemDivisaoId: itemId,
          resultadoHomologacao: "SUCESSO",
          valorAdjudicado: valorUnitario * quantidadeIncluida,
        },
      }),
    ]);
  }
}

async function aplicarAlocacoesHomologacao(
  grupo: GrupoHomologacaoItem,
  alocacoes: { itemId: string; origem: "DFD" | "TECNICO"; quantidadeIncluida: number }[],
  valorUnitario: number,
) {
  for (const aloc of alocacoes) {
    const itemOriginal = grupo.itens.find((it) => it.id === aloc.itemId);
    if (!itemOriginal) continue;
    if (aloc.quantidadeIncluida >= itemOriginal.quantidade) {
      const data = { resultadoHomologacao: "SUCESSO" as const, valorAdjudicado: valorUnitario * itemOriginal.quantidade };
      if (aloc.origem === "DFD") await prisma.itemDfd.update({ where: { id: aloc.itemId }, data });
      else await prisma.itemTecnico.update({ where: { id: aloc.itemId }, data });
    } else {
      await dividirEHomologarItem(aloc.origem, aloc.itemId, aloc.quantidadeIncluida, valorUnitario);
    }
  }
}

// ---------------------------------------------------------------------------
// Status do processo + revisão de prioridade/prazo
// ---------------------------------------------------------------------------

export async function registrarStatusLicitacaoAction(consolidacaoId: string, formData: FormData) {
  const sessao = await exigirLicitacoes();
  const consolidacao = await obterConsolidacaoOuErro(consolidacaoId);
  const statusAtual = await statusAtualDaConsolidacao(consolidacaoId);

  const novoStatus = String(formData.get("status") ?? "") as StatusLicitacaoValor;
  const permitidos = proximosStatusLicitacao(statusAtual, consolidacao.tipoContratacao);
  const info = permitidos.find((o) => o.value === novoStatus);
  if (!info) throw new Error("Status inválido ou fora de sequência — atualize a página e tente novamente.");

  const dados: Partial<Record<CampoStatusLicitacao, string>> = {};
  for (const campo of info.campos) {
    const valor = String(formData.get(campo) ?? "").trim();
    if (!valor) throw new Error("Preencha todos os campos obrigatórios deste status.");
    dados[campo] = valor;
  }

  await prisma.statusLicitacao.create({
    data: {
      consolidacaoId,
      status: novoStatus,
      criadoPorId: sessao.id,
      responsavel: dados.responsavel ?? null,
      dataDiligencia: dados.dataDiligencia ? new Date(dados.dataDiligencia) : null,
      prazoResposta: dados.prazoResposta ? new Date(dados.prazoResposta) : null,
      dataSessao: dados.dataSessao ? new Date(dados.dataSessao) : null,
      agenteNome: dados.agenteNome ?? null,
      agenteMatricula: dados.agenteMatricula ?? null,
    },
  });

  revalidatePath(`/licitacoes/${consolidacaoId}`);
  revalidatePath("/");
}

export async function salvarRevisaoLicitacaoAction(consolidacaoId: string, formData: FormData) {
  const sessao = await exigirLicitacoes();
  await obterConsolidacaoOuErro(consolidacaoId);

  const prioridade = String(formData.get("prioridade") ?? "") as "ALTA" | "MEDIA" | "BAIXA";
  const dataEsperadaConclusao = String(formData.get("dataEsperadaConclusao") ?? "");
  const justificativa = String(formData.get("justificativa") ?? "").trim();

  if (!["ALTA", "MEDIA", "BAIXA"].includes(prioridade)) throw new Error("Selecione a prioridade.");
  if (!dataEsperadaConclusao) throw new Error("Informe a nova data esperada de conclusão.");
  if (!justificativa) throw new Error("Informe a justificativa da revisão.");

  await prisma.consolidacaoTecnica.update({
    where: { id: consolidacaoId },
    data: {
      revisaoPrioridade: prioridade,
      revisaoDataEsperadaConclusao: new Date(dataEsperadaConclusao),
      revisaoJustificativa: justificativa,
      revisaoEm: new Date(),
      revisaoPorId: sessao.id,
    },
  });

  revalidatePath(`/licitacoes/${consolidacaoId}`);
}

// ---------------------------------------------------------------------------
// Homologação
// ---------------------------------------------------------------------------

export async function registrarHomologacaoGrupoAction(consolidacaoId: string, formData: FormData) {
  const consolidacao = await obterConsolidacaoOuErro(consolidacaoId);
  await exigirAcessoHomologacao(consolidacao);

  const nomeGrupo = String(formData.get("nomeGrupo") ?? "");
  const resultado = String(formData.get("resultado") ?? "") as
    | "sucesso_total"
    | "sucesso_parcial"
    | "fracassado"
    | "deserto";

  const pendentes = await itensPendentesHomologacao(consolidacaoId);
  const grupo = agruparItensParaHomologacao(pendentes).find((g) => g.nome === nomeGrupo);
  if (!grupo) throw new Error("Grupo não encontrado — a tela pode estar desatualizada, recarregue e tente novamente.");

  if (resultado === "fracassado" || resultado === "deserto") {
    await aplicarResultadoUniforme(grupo.itens, resultado === "fracassado" ? "FRACASSADO" : "DESERTO", null);
    await avancarStatusAposHomologacaoCompleta(consolidacaoId);
    revalidatePath(`/licitacoes/${consolidacaoId}`);
    return;
  }

  const valorUnitario = Number(formData.get("valorUnitario") ?? 0);
  if (!(valorUnitario > 0)) throw new Error("Informe o valor unitário adjudicado.");

  if (resultado === "sucesso_total") {
    await aplicarResultadoUniforme(grupo.itens, "SUCESSO", valorUnitario);
    await avancarStatusAposHomologacaoCompleta(consolidacaoId);
    revalidatePath(`/licitacoes/${consolidacaoId}`);
    return;
  }

  // sucesso_parcial
  const quantidadeHomologada = Number(formData.get("quantidadeHomologada") ?? 0);
  if (!(quantidadeHomologada > 0) || quantidadeHomologada >= grupo.quantidadeTotal) {
    throw new Error("Informe uma quantidade parcial válida (maior que zero e menor que o total do grupo).");
  }
  if (quantidadeHomologada < grupo.quantidadeOP) {
    throw new Error(
      "A quantidade informada não cobre todos os itens OP do grupo. Use a alocação manual abaixo para indicar quais demandantes ficam nesta rodada.",
    );
  }

  const alocacoes = planejarHomologacaoParcialAutomatica(grupo, quantidadeHomologada);
  await aplicarAlocacoesHomologacao(grupo, alocacoes, valorUnitario);
  await avancarStatusAposHomologacaoCompleta(consolidacaoId);
  revalidatePath(`/licitacoes/${consolidacaoId}`);
}

export async function confirmarHomologacaoManualAction(consolidacaoId: string, formData: FormData) {
  const consolidacao = await obterConsolidacaoOuErro(consolidacaoId);
  await exigirAcessoHomologacao(consolidacao);

  const nomeGrupo = String(formData.get("nomeGrupo") ?? "");
  const valorUnitario = Number(formData.get("valorUnitario") ?? 0);
  const quantidadeHomologada = Number(formData.get("quantidadeHomologada") ?? 0);

  const pendentes = await itensPendentesHomologacao(consolidacaoId);
  const grupo = agruparItensParaHomologacao(pendentes).find((g) => g.nome === nomeGrupo);
  if (!grupo) throw new Error("Grupo não encontrado — a tela pode estar desatualizada, recarregue e tente novamente.");

  const alocacoes: { itemId: string; origem: "DFD" | "TECNICO"; quantidadeIncluida: number }[] = [];
  let soma = 0;
  for (const it of grupo.itens) {
    const qtd = Number(formData.get(`qtd_${it.id}`) ?? 0);
    if (qtd < 0 || qtd > it.quantidade) {
      throw new Error(`Quantidade inválida para "${it.unidadeNome ?? it.nome}".`);
    }
    soma += qtd;
    if (qtd > 0) alocacoes.push({ itemId: it.id, origem: it.origem, quantidadeIncluida: qtd });
  }
  if (soma !== quantidadeHomologada) {
    throw new Error(`A soma informada (${soma}) precisa ser exatamente ${quantidadeHomologada}.`);
  }

  await aplicarAlocacoesHomologacao(grupo, alocacoes, valorUnitario);
  await avancarStatusAposHomologacaoCompleta(consolidacaoId);
  revalidatePath(`/licitacoes/${consolidacaoId}`);
}

export async function registrarHomologacaoGrupoServicoValorAction(consolidacaoId: string, formData: FormData) {
  const consolidacao = await obterConsolidacaoOuErro(consolidacaoId);
  await exigirAcessoHomologacao(consolidacao);

  const nomeGrupo = String(formData.get("nomeGrupo") ?? "");
  const resultado = String(formData.get("resultado") ?? "") as "sucesso" | "fracassado" | "deserto";

  const pendentes = await itensPendentesHomologacao(consolidacaoId);
  const grupo = agruparServicosValorPorCategoria(pendentes).find((g) => g.nome === nomeGrupo);
  if (!grupo) throw new Error("Grupo não encontrado — a tela pode estar desatualizada, recarregue e tente novamente.");

  const resultadoEnum = resultado === "sucesso" ? "SUCESSO" : resultado === "fracassado" ? "FRACASSADO" : "DESERTO";
  await prisma.$transaction(
    grupo.itens.map((it) => {
      const data = {
        resultadoHomologacao: resultadoEnum as "SUCESSO" | "FRACASSADO" | "DESERTO",
        valorAdjudicado: resultado === "sucesso" ? it.valorTotal : null,
      };
      return it.origem === "DFD"
        ? prisma.itemDfd.update({ where: { id: it.id }, data })
        : prisma.itemTecnico.update({ where: { id: it.id }, data });
    }),
  );
  await avancarStatusAposHomologacaoCompleta(consolidacaoId);
  revalidatePath(`/licitacoes/${consolidacaoId}`);
}

export async function registrarHomologacaoServicoAction(consolidacaoId: string, itemId: string, formData: FormData) {
  const consolidacao = await obterConsolidacaoOuErro(consolidacaoId);
  await exigirAcessoHomologacao(consolidacao);

  const resultado = String(formData.get("resultado") ?? "") as "sucesso" | "fracassado" | "deserto";
  let valorAdjudicado: number | null = null;
  if (resultado === "sucesso") {
    valorAdjudicado = Number(formData.get("valor") ?? 0);
    if (!(valorAdjudicado > 0)) throw new Error("Informe o valor adjudicado.");
  }

  const pendentes = await itensPendentesHomologacao(consolidacaoId);
  const item = servicosPendentesHomologacao(pendentes).find((it) => it.id === itemId);
  if (!item) throw new Error("Item não encontrado — a tela pode estar desatualizada, recarregue e tente novamente.");

  const data = {
    resultadoHomologacao:
      resultado === "sucesso" ? ("SUCESSO" as const) : resultado === "fracassado" ? ("FRACASSADO" as const) : ("DESERTO" as const),
    valorAdjudicado,
  };
  if (item.origem === "DFD") await prisma.itemDfd.update({ where: { id: itemId }, data });
  else await prisma.itemTecnico.update({ where: { id: itemId }, data });

  await avancarStatusAposHomologacaoCompleta(consolidacaoId);
  revalidatePath(`/licitacoes/${consolidacaoId}`);
}

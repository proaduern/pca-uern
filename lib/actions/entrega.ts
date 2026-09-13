"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirEntrega, exigirUnidade } from "@/lib/auth";
import { proximosStatusEntrega, subperfilBensPorTipo, type StatusEntregaValor } from "@/lib/entrega";

/**
 * Itens de material já recebidos em definitivo pela Execução, ainda sem
 * registro de entrega — fila da PROAD para autorizar (itensProntosParaEstoque/
 * itensAguardandoAutorizacaoProad do sistema original).
 */
export async function itensAguardandoAutorizacaoEntrega() {
  const itens = await prisma.itemDfd.findMany({
    where: {
      tipo: "MATERIAL",
      resultadoHomologacao: "SUCESSO",
      processoExecucaoId: { not: null },
      entrega: null,
    },
    include: {
      dfd: { include: { unidade: true } },
      categoria: true,
      processoExecucao: { include: { statusExecucao: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
  });
  return itens.filter((it) => it.processoExecucao?.statusExecucao[0]?.status === "RECEBIDA_DEFINITIVO");
}

/**
 * Autoriza a entrega dos itens selecionados: cria o registro de Entrega
 * (snapshot autocontido) já nascendo com o histórico em_estoque ->
 * autorizado_proad, igual ao autorizarEntregaSelecionados do sistema original.
 */
export async function autorizarEntregaSelecionadosAction(itemDfdIds: string[]) {
  await exigirAdmin();
  if (itemDfdIds.length === 0) throw new Error("Selecione ao menos um item.");

  const pendentes = (await itensAguardandoAutorizacaoEntrega()).filter((it) => itemDfdIds.includes(it.id));
  if (pendentes.length === 0) {
    throw new Error("Nenhum item válido selecionado — a tela pode estar desatualizada, recarregue e tente novamente.");
  }

  await prisma.$transaction(
    pendentes.map((it) => {
      const agora = new Date();
      return prisma.entrega.create({
        data: {
          unidadeId: it.dfd.unidadeId,
          categoriaId: it.categoriaId,
          itemNome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
          enquadramento: it.enquadramento,
          tipoBem: it.tipoBem,
          subperfilBens: subperfilBensPorTipo(it.tipoBem),
          valorAdjudicado: it.valorAdjudicado ?? it.valorTotal,
          processoExecucaoId: it.processoExecucaoId,
          itemDfdId: it.id,
          statusEntrega: {
            // Timestamps explícitos (1ms de diferença) para garantir a ordem
            // determinística em_estoque -> autorizado_proad mesmo quando
            // ambas as linhas nascem na mesma transação.
            create: [
              { status: "EM_ESTOQUE", createdAt: agora },
              { status: "AUTORIZADO_PROAD", createdAt: new Date(agora.getTime() + 1) },
            ],
          },
        },
      });
    }),
  );

  revalidatePath("/admin/entrega");
}

/**
 * Ratifica (ou não) uma contestação já analisada e aprovada pela Unidade de
 * Entrega de Bens. Ratificar reabre a entrega para nova tentativa (volta o
 * status para entrega_andamento) e encerra o ciclo de confirmação atual.
 */
export async function ratificarContestacaoAction(entregaId: string, ratificar: boolean) {
  await exigirAdmin();
  const confirmacao = await prisma.confirmacaoEntrega.findFirst({
    where: { entregaId },
    orderBy: { createdAt: "desc" },
  });
  if (!confirmacao || confirmacao.status !== "CONTESTACAO_PENDENTE_ADMIN") {
    throw new Error("Não há contestação aguardando ratificação para esta entrega.");
  }

  if (ratificar) {
    await prisma.$transaction([
      prisma.confirmacaoEntrega.update({
        where: { id: confirmacao.id },
        data: { status: "CONTESTACAO_RATIFICADA", contestacaoAnaliseAdminOk: true, contestacaoAnaliseAdminEm: new Date() },
      }),
      prisma.statusEntrega.create({ data: { entregaId, status: "ENTREGA_ANDAMENTO" } }),
    ]);
  } else {
    await prisma.confirmacaoEntrega.update({
      where: { id: confirmacao.id },
      data: { status: "CONTESTACAO_REJEITADA", contestacaoAnaliseAdminOk: false, contestacaoAnaliseAdminEm: new Date() },
    });
  }

  revalidatePath("/admin/entrega");
}

// ---------------------------------------------------------------------------
// Painel da Unidade de Entrega de Bens
// ---------------------------------------------------------------------------

/** Contestações já registradas pelo demandante, aguardando análise desta unidade de entrega. */
export async function contestacoesPendentesDaMinhaEntrega(subperfil: "PATRIMONIO" | "ALMOXARIFADO") {
  const confirmacoes = await prisma.confirmacaoEntrega.findMany({
    where: { status: "CONTESTACAO_PENDENTE_ENTREGA", entrega: { subperfilBens: subperfil } },
    include: { entrega: { include: { unidade: true } } },
    orderBy: { createdAt: "desc" },
  });
  return confirmacoes;
}

export async function aprovarContestacaoEntregaAction(entregaId: string) {
  const sessao = await exigirEntrega();
  const confirmacao = await prisma.confirmacaoEntrega.findFirst({
    where: { entregaId },
    orderBy: { createdAt: "desc" },
  });
  if (!confirmacao || confirmacao.status !== "CONTESTACAO_PENDENTE_ENTREGA") {
    throw new Error("Não há contestação pendente de análise para esta entrega.");
  }
  await prisma.confirmacaoEntrega.update({
    where: { id: confirmacao.id },
    data: {
      status: "CONTESTACAO_PENDENTE_ADMIN",
      contestacaoAnaliseEntregaOk: true,
      contestacaoAnaliseEntregaPorId: sessao.id,
      contestacaoAnaliseEntregaEm: new Date(),
    },
  });
  revalidatePath("/");
}

export async function rejeitarContestacaoEntregaAction(entregaId: string, formData: FormData) {
  const sessao = await exigirEntrega();
  const comentario = String(formData.get("comentario") ?? "").trim();
  if (!comentario) throw new Error("Informe um motivo para rejeitar a contestação.");
  const confirmacao = await prisma.confirmacaoEntrega.findFirst({
    where: { entregaId },
    orderBy: { createdAt: "desc" },
  });
  if (!confirmacao || confirmacao.status !== "CONTESTACAO_PENDENTE_ENTREGA") {
    throw new Error("Não há contestação pendente de análise para esta entrega.");
  }
  await prisma.confirmacaoEntrega.update({
    where: { id: confirmacao.id },
    data: {
      status: "CONTESTACAO_REJEITADA",
      contestacaoAnaliseEntregaOk: false,
      contestacaoAnaliseEntregaComentario: comentario,
      contestacaoAnaliseEntregaPorId: sessao.id,
      contestacaoAnaliseEntregaEm: new Date(),
    },
  });
  revalidatePath("/");
}

/**
 * Avança o status de uma entrega. Ao marcar como "entregue", a quantidade
 * pode ser parcial (dividirItem): a parte entregue agora passa a ser
 * representada por esta mesma Entrega (que migra para o novo item, já
 * reduzido), e o item original permanece com o restante, sem entrega
 * associada — volta a aguardar nova autorização da PROAD.
 */
export async function avancarStatusEntregaAction(entregaId: string, formData: FormData) {
  const sessao = await exigirEntrega();
  const entrega = await prisma.entrega.findUniqueOrThrow({
    where: { id: entregaId },
    include: { statusEntrega: { orderBy: { createdAt: "desc" }, take: 1 }, itemDfd: true },
  });

  const statusAtual = entrega.statusEntrega[0]?.status ?? null;
  const novoStatus = String(formData.get("status") ?? "") as StatusEntregaValor;
  const permitidos = proximosStatusEntrega(statusAtual);
  if (!permitidos.some((o) => o.value === novoStatus)) {
    throw new Error("Status inválido ou fora de sequência — atualize a página e tente novamente.");
  }

  let avisoParcial = "";

  if (novoStatus === "ENTREGUE" && !entrega.viaEstoque && entrega.itemDfd) {
    const qtdInformada = formData.get("quantidadeEntregue");
    const item = entrega.itemDfd;
    const qtdOriginal = Number(item.quantidade ?? 1);
    if (qtdInformada != null && qtdOriginal > 1) {
      const qtdEntregue = Number(qtdInformada) || 0;
      if (qtdEntregue > 0 && qtdEntregue < qtdOriginal) {
        const valorUnitAdj = Number(entrega.valorAdjudicado) / qtdOriginal;
        const valorUnit = Number(item.valorUnit ?? 0);
        const quantidadeRestante = qtdOriginal - qtdEntregue;

        await prisma.$transaction(async (tx) => {
          await tx.itemDfd.update({
            where: { id: item.id },
            data: { quantidade: quantidadeRestante, valorTotal: valorUnit * quantidadeRestante },
          });
          const criado = await tx.itemDfd.create({
            data: {
              dfdId: item.dfdId,
              tipo: item.tipo,
              enquadramento: item.enquadramento,
              categoriaId: item.categoriaId,
              itemCatalogoNome: item.itemCatalogoNome,
              itemNomeLivre: item.itemNomeLivre,
              tipoBem: item.tipoBem,
              quantidade: qtdEntregue,
              valorUnit: item.valorUnit,
              valorTotal: valorUnit * qtdEntregue,
              correlacao: item.correlacao,
              consolidacaoTecnicaId: item.consolidacaoTecnicaId,
              itemOrigemDivisaoId: item.id,
              resultadoHomologacao: "SUCESSO",
              valorAdjudicado: valorUnitAdj * qtdEntregue,
              processoExecucaoId: item.processoExecucaoId,
            },
          });
          // A entrega atual passa a representar a parte efetivamente entregue
          // agora; o item original (mesmo id) fica reduzido ao restante, sem
          // entrega associada — volta a aparecer para a PROAD autorizar uma
          // nova entrega quando o restante chegar.
          await tx.entrega.update({ where: { id: entregaId }, data: { itemDfdId: criado.id, valorAdjudicado: valorUnitAdj * qtdEntregue } });
        });
        avisoParcial = ` Entrega parcial registrada: ${qtdEntregue} de ${qtdOriginal}. O restante (${quantidadeRestante}) volta a aguardar autorização da PROAD.`;
      }
    }
  }

  await prisma.statusEntrega.create({ data: { entregaId, status: novoStatus, criadoPorId: sessao.id } });

  if (novoStatus === "ENTREGUE" && entrega.unidadeId) {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + 10);
    await prisma.confirmacaoEntrega.create({ data: { entregaId, status: "PENDENTE", dataLimite } });
  }
  // Itens sem destinatário específico (estoque geral) não têm demandante para confirmar — ficam concluídos direto.

  revalidatePath("/");
  revalidatePath(`/entrega/${entregaId}`);
  return avisoParcial || undefined;
}

// ---------------------------------------------------------------------------
// Confirmação do demandante (Unidade)
// ---------------------------------------------------------------------------

async function obterConfirmacaoPendenteOuErro(entregaId: string, unidadeId: string) {
  const entrega = await prisma.entrega.findUniqueOrThrow({ where: { id: entregaId }, include: { itemDfd: true } });
  if (entrega.unidadeId !== unidadeId) throw new Error("Esta entrega não pertence à sua unidade.");
  const confirmacao = await prisma.confirmacaoEntrega.findFirst({ where: { entregaId }, orderBy: { createdAt: "desc" } });
  if (!confirmacao || confirmacao.status !== "PENDENTE") {
    throw new Error("Não há confirmação pendente para esta entrega.");
  }
  return { confirmacao, dfdId: entrega.itemDfd?.dfdId ?? null };
}

export async function confirmarRecebimentoEntregaAction(entregaId: string) {
  const sessao = await exigirUnidade();
  const { confirmacao, dfdId } = await obterConfirmacaoPendenteOuErro(entregaId, sessao.id);
  await prisma.confirmacaoEntrega.update({
    where: { id: confirmacao.id },
    data: { status: "CONFIRMADO", confirmadoEm: new Date() },
  });
  revalidatePath("/");
  if (dfdId) revalidatePath(`/dfd/${dfdId}`);
}

export async function enviarContestacaoEntregaAction(entregaId: string, formData: FormData) {
  const sessao = await exigirUnidade();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Descreva o motivo da contestação.");
  const { confirmacao, dfdId } = await obterConfirmacaoPendenteOuErro(entregaId, sessao.id);
  await prisma.confirmacaoEntrega.update({
    where: { id: confirmacao.id },
    data: { status: "CONTESTACAO_PENDENTE_ENTREGA", contestacaoMotivo: motivo, contestacaoSolicitadoEm: new Date() },
  });
  revalidatePath("/");
  if (dfdId) revalidatePath(`/dfd/${dfdId}`);
}

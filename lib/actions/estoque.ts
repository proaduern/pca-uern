"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirEntrega, exigirUnidade } from "@/lib/auth";
import { calcularGastos, dfdComprometeOrcamento } from "@/lib/cota";
import { subperfilBensPorTipo } from "@/lib/entrega";

// ---------------------------------------------------------------------------
// Atendimento por Estoque (exceção do Patrimônio para itens OP já consolidados)
// ---------------------------------------------------------------------------

/**
 * Itens OP de material já consolidados, elegíveis para atendimento imediato
 * por estoque: ainda sem proposta, sem entrega própria, e ainda não
 * recebidos em definitivo pela Execução (depois disso não faz mais sentido
 * propor estoque) — equivalente a itensElegiveisAtendimentoEstoque.
 */
export async function itensElegiveisAtendimentoEstoque() {
  const itens = await prisma.itemDfd.findMany({
    where: {
      tipo: "MATERIAL",
      enquadramento: "OP",
      consolidacaoTecnicaId: { not: null },
      atendimentoEstoque: null,
      entrega: null,
    },
    include: {
      dfd: { include: { unidade: true } },
      categoria: true,
      processoExecucao: { include: { statusExecucao: { orderBy: { createdAt: "desc" }, take: 1 } } },
    },
    orderBy: { createdAt: "asc" },
  });
  return itens.filter((it) => it.processoExecucao?.statusExecucao[0]?.status !== "RECEBIDA_DEFINITIVO");
}

export async function propostasAtendimentoEstoquePendentes() {
  return prisma.atendimentoEstoque.findMany({
    where: { status: "PENDENTE_PROAD" },
    include: { itemDfd: { include: { dfd: { include: { unidade: true } }, categoria: true } } },
    orderBy: { solicitadoEm: "asc" },
  });
}

/**
 * A Unidade de Patrimônio propõe atender de imediato, com o que já tem em
 * estoque, uma demanda OP já consolidada — sem esperar o fim da licitação.
 */
export async function proporAtendimentoEstoqueAction(itemDfdId: string) {
  const sessao = await exigirEntrega();
  const acesso = await prisma.acessoEntrega.findUniqueOrThrow({ where: { id: sessao.id } });
  if (acesso.subperfil !== "PATRIMONIO") {
    throw new Error("Só a Unidade de Patrimônio pode propor atendimento por estoque.");
  }
  const elegiveis = await itensElegiveisAtendimentoEstoque();
  if (!elegiveis.some((it) => it.id === itemDfdId)) {
    throw new Error("Item não encontrado ou não elegível — a tela pode estar desatualizada, recarregue e tente novamente.");
  }

  await prisma.atendimentoEstoque.create({
    data: { itemDfdId, solicitadoPorId: sessao.id },
  });

  revalidatePath("/");
}

/**
 * A PROAD aprova o atendimento por estoque: o item consolidado deixa de ter
 * destinação específica e passa a ser estoque geral, vinculado ao
 * Patrimônio; uma entrega avulsa (sem item de origem) já nasce autorizada,
 * para a Unidade de Patrimônio distribuir.
 */
export async function aprovarAtendimentoEstoqueAction(atendimentoId: string) {
  await exigirAdmin();
  const atendimento = await prisma.atendimentoEstoque.findUniqueOrThrow({
    where: { id: atendimentoId },
    include: { itemDfd: { include: { dfd: true, categoria: true } } },
  });
  if (atendimento.status !== "PENDENTE_PROAD") {
    throw new Error("Esta proposta já foi analisada.");
  }
  const item = atendimento.itemDfd;
  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    const entrega = await tx.entrega.create({
      data: {
        unidadeId: item.dfd.unidadeId,
        categoriaId: item.categoriaId,
        itemNome: item.itemCatalogoNome ?? item.itemNomeLivre ?? "(sem nome)",
        enquadramento: item.enquadramento,
        tipoBem: item.tipoBem,
        subperfilBens: "PATRIMONIO",
        valorAdjudicado: item.valorTotal,
        viaEstoque: true,
        statusEntrega: {
          create: [
            { status: "EM_ESTOQUE", createdAt: agora },
            { status: "AUTORIZADO_PROAD", createdAt: new Date(agora.getTime() + 1) },
          ],
        },
      },
    });
    await tx.atendimentoEstoque.update({
      where: { id: atendimentoId },
      data: { status: "APROVADO", analisadoEm: agora, entregaId: entrega.id },
    });
    await tx.itemDfd.update({
      where: { id: item.id },
      data: { estoqueGeral: true, estoqueGeralDesde: agora },
    });
  });

  revalidatePath("/admin/entrega");
  revalidatePath(`/dfd/${item.dfdId}`);
}

export async function rejeitarAtendimentoEstoqueAction(atendimentoId: string, formData: FormData) {
  await exigirAdmin();
  const motivo = String(formData.get("motivo") ?? "").trim();
  const atendimento = await prisma.atendimentoEstoque.findUniqueOrThrow({ where: { id: atendimentoId } });
  if (atendimento.status !== "PENDENTE_PROAD") {
    throw new Error("Esta proposta já foi analisada.");
  }
  await prisma.atendimentoEstoque.update({
    where: { id: atendimentoId },
    data: { status: "REJEITADO", motivoRejeicao: motivo || null, analisadoEm: new Date() },
  });
  revalidatePath("/admin/entrega");
}

/** Itens que deixaram de ter destinatário específico (ex-OP atendidos por estoque ou trocados) — acompanhamento da PROAD. */
export async function itensEstoqueGeral() {
  return prisma.itemDfd.findMany({
    where: { estoqueGeral: true },
    include: { categoria: true },
    orderBy: { estoqueGeralDesde: "desc" },
  });
}

// ---------------------------------------------------------------------------
// Troca de Item (OP): demandante -> PROAD (triagem) -> Patrimônio
// (disponibilidade) -> PROAD (autorização final)
// ---------------------------------------------------------------------------

async function saldoOPDaUnidade(unidadeId: string): Promise<number> {
  const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: unidadeId } });
  const dfds = await prisma.dfd.findMany({ where: { unidadeId }, include: { itens: true } });
  const itensComprometidos = dfds
    .filter((d) => dfdComprometeOrcamento(d.status))
    .flatMap((d) => d.itens)
    .map((it) => ({ enquadramento: it.enquadramento, valorTotal: Number(it.valorTotal) }));
  const gastos = calcularGastos(itensComprometidos);
  return Number(unidade.cotaOP) - gastos.op;
}

export async function enviarSolicitacaoTrocaOPAction(itemDfdId: string, formData: FormData) {
  const sessao = await exigirUnidade();
  const item = await prisma.itemDfd.findUniqueOrThrow({ where: { id: itemDfdId }, include: { dfd: true, trocaOP: true } });
  if (item.dfd.unidadeId !== sessao.id) throw new Error("Este item não pertence à sua unidade.");
  if (item.enquadramento !== "OP" || item.tipo !== "MATERIAL") {
    throw new Error("A troca de item só está disponível para materiais com enquadramento OP.");
  }
  if (item.trocaOP) throw new Error("Já existe uma solicitação de troca para este item.");

  const justificativa = String(formData.get("justificativa") ?? "").trim();
  if (!justificativa) throw new Error("Informe a justificativa da troca.");

  const foraCatalogo = formData.get("foraCatalogo") === "on";
  let itemBOrigemCatalogo: boolean;
  let itemBCategoriaId: string;
  let itemBNome: string;
  let itemBValor: number;
  let itemBTipoBem: "CONSUMO" | "PERMANENTE";

  if (foraCatalogo) {
    itemBNome = String(formData.get("nomeCustom") ?? "").trim();
    itemBValor = Number(formData.get("valorCustom") ?? 0);
    itemBCategoriaId = String(formData.get("categoriaCustomId") ?? "");
    itemBTipoBem = String(formData.get("tipoBemCustom") ?? "PERMANENTE") as "CONSUMO" | "PERMANENTE";
    if (!itemBNome || !(itemBValor > 0) || !itemBCategoriaId) {
      throw new Error("Preencha nome, valor e categoria do item desejado.");
    }
    const categoria = await prisma.categoria.findUnique({ where: { id: itemBCategoriaId } });
    if (!categoria) throw new Error("Categoria não encontrada.");
    itemBOrigemCatalogo = false;
  } else {
    const itemCatalogoId = String(formData.get("itemCatalogoId") ?? "");
    if (!itemCatalogoId) throw new Error("Selecione o item desejado no catálogo, ou marque \"não está no catálogo\".");
    const itemCatalogo = await prisma.itemCatalogo.findUnique({ where: { id: itemCatalogoId }, include: { categoria: true } });
    if (!itemCatalogo) throw new Error("Item de catálogo não encontrado.");
    itemBOrigemCatalogo = true;
    itemBCategoriaId = itemCatalogo.categoriaId;
    itemBNome = itemCatalogo.item;
    itemBValor = Number(itemCatalogo.valor);
    itemBTipoBem = itemCatalogo.tipoBem;
  }

  await prisma.trocaOP.create({
    data: {
      itemDfdId,
      justificativaDemandante: justificativa,
      itemBOrigemCatalogo,
      itemBCategoriaId,
      itemBNome,
      itemBValor,
      itemBTipoBem,
    },
  });

  revalidatePath(`/dfd/${item.dfdId}`);
}

export async function encaminharTrocaOPPatrimonioAction(trocaId: string) {
  await exigirAdmin();
  const troca = await prisma.trocaOP.findUniqueOrThrow({ where: { id: trocaId } });
  if (troca.status !== "PENDENTE_PROAD_INICIAL") throw new Error("Esta solicitação já foi analisada.");
  await prisma.trocaOP.update({
    where: { id: trocaId },
    data: { status: "PENDENTE_PATRIMONIO", analiseProadInicialOk: true, analiseProadInicialEm: new Date() },
  });
  revalidatePath("/admin/entrega");
}

export async function rejeitarTrocaOPInicialAction(trocaId: string, formData: FormData) {
  await exigirAdmin();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Informe um motivo.");
  const troca = await prisma.trocaOP.findUniqueOrThrow({ where: { id: trocaId }, include: { itemDfd: true } });
  if (troca.status !== "PENDENTE_PROAD_INICIAL") throw new Error("Esta solicitação já foi analisada.");
  await prisma.trocaOP.update({
    where: { id: trocaId },
    data: { status: "REJEITADO_INICIAL", analiseProadInicialOk: false, analiseProadInicialMotivo: motivo, analiseProadInicialEm: new Date() },
  });
  revalidatePath("/admin/entrega");
  revalidatePath(`/dfd/${troca.itemDfd.dfdId}`);
}

export async function confirmarDisponibilidadeTrocaAction(trocaId: string) {
  const sessao = await exigirEntrega();
  const acesso = await prisma.acessoEntrega.findUniqueOrThrow({ where: { id: sessao.id } });
  if (acesso.subperfil !== "PATRIMONIO") throw new Error("Só a Unidade de Patrimônio pode analisar disponibilidade.");
  const troca = await prisma.trocaOP.findUniqueOrThrow({ where: { id: trocaId } });
  if (troca.status !== "PENDENTE_PATRIMONIO") throw new Error("Esta solicitação não está aguardando verificação de disponibilidade.");
  await prisma.trocaOP.update({
    where: { id: trocaId },
    data: { status: "PENDENTE_PROAD_FINAL", analisePatrimonioDisponivel: true, analisePatrimonioPorId: sessao.id, analisePatrimonioEm: new Date() },
  });
  revalidatePath("/");
}

export async function indisponivelTrocaAction(trocaId: string) {
  const sessao = await exigirEntrega();
  const acesso = await prisma.acessoEntrega.findUniqueOrThrow({ where: { id: sessao.id } });
  if (acesso.subperfil !== "PATRIMONIO") throw new Error("Só a Unidade de Patrimônio pode analisar disponibilidade.");
  const troca = await prisma.trocaOP.findUniqueOrThrow({ where: { id: trocaId } });
  if (troca.status !== "PENDENTE_PATRIMONIO") throw new Error("Esta solicitação não está aguardando verificação de disponibilidade.");
  await prisma.trocaOP.update({
    where: { id: trocaId },
    data: { status: "SEM_ESTOQUE", analisePatrimonioDisponivel: false, analisePatrimonioPorId: sessao.id, analisePatrimonioEm: new Date() },
  });
  revalidatePath("/");
}

/** Retorna se autorizar esta troca deixaria o saldo de Cota OP da unidade negativo. */
export async function trocaOPExtrapolaSaldo(trocaId: string): Promise<boolean> {
  const troca = await prisma.trocaOP.findUniqueOrThrow({ where: { id: trocaId }, include: { itemDfd: { include: { dfd: true } } } });
  const saldoAtual = await saldoOPDaUnidade(troca.itemDfd.dfd.unidadeId);
  const delta = Number(troca.itemBValor) - Number(troca.itemDfd.valorTotal);
  return delta > saldoAtual;
}

/**
 * A PROAD autoriza a troca: cria o "item B" já na mesma DFD do item
 * original (viaTrocaOP), com uma entrega avulsa já autorizada; o item
 * original ("item A") deixa de ter destinação específica e passa a ser
 * estoque geral — nunca é removido, seu ciclo real segue só para fins de
 * métrica do PCA.
 */
export async function autorizarTrocaOPFinalAction(trocaId: string) {
  await exigirAdmin();
  const troca = await prisma.trocaOP.findUniqueOrThrow({
    where: { id: trocaId },
    include: { itemDfd: { include: { dfd: true } } },
  });
  if (troca.status !== "PENDENTE_PROAD_FINAL") throw new Error("Esta solicitação não está aguardando autorização final.");
  const item = troca.itemDfd;
  const extrapola = await trocaOPExtrapolaSaldo(trocaId);
  const agora = new Date();

  await prisma.$transaction(async (tx) => {
    const novoItem = await tx.itemDfd.create({
      data: {
        dfdId: item.dfdId,
        tipo: "MATERIAL",
        enquadramento: "OP",
        categoriaId: troca.itemBCategoriaId,
        itemNomeLivre: troca.itemBNome,
        tipoBem: troca.itemBTipoBem,
        quantidade: item.quantidade ?? 1,
        valorUnit: troca.itemBValor,
        valorTotal: Number(troca.itemBValor) * Number(item.quantidade ?? 1),
        correlacao: `Item obtido via troca autorizada pela PROAD, em substituição a "${item.itemCatalogoNome ?? item.itemNomeLivre}". Justificativa: ${troca.justificativaDemandante}`,
        viaTrocaOP: true,
        estoqueGeral: false,
      },
    });
    const entrega = await tx.entrega.create({
      data: {
        unidadeId: item.dfd.unidadeId,
        categoriaId: troca.itemBCategoriaId,
        itemNome: troca.itemBNome,
        enquadramento: "OP",
        tipoBem: troca.itemBTipoBem,
        subperfilBens: subperfilBensPorTipo(troca.itemBTipoBem),
        valorAdjudicado: novoItem.valorTotal,
        itemDfdId: novoItem.id,
        viaEstoque: true,
        viaTrocaOP: true,
        statusEntrega: {
          create: [
            { status: "EM_ESTOQUE", createdAt: agora },
            { status: "AUTORIZADO_PROAD", createdAt: new Date(agora.getTime() + 1) },
          ],
        },
      },
    });
    await tx.trocaOP.update({
      where: { id: trocaId },
      data: {
        status: "APROVADO",
        analiseProadFinalOk: true,
        analiseProadFinalExtrapolou: extrapola,
        analiseProadFinalEm: agora,
        itemNovoId: novoItem.id,
      },
    });
    await tx.itemDfd.update({ where: { id: item.id }, data: { estoqueGeral: true, estoqueGeralDesde: agora } });
    return entrega;
  });

  revalidatePath("/admin/entrega");
  revalidatePath(`/dfd/${item.dfdId}`);
}

export async function rejeitarTrocaOPFinalAction(trocaId: string, formData: FormData) {
  await exigirAdmin();
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!motivo) throw new Error("Informe um motivo.");
  const troca = await prisma.trocaOP.findUniqueOrThrow({ where: { id: trocaId }, include: { itemDfd: true } });
  if (troca.status !== "PENDENTE_PROAD_FINAL") throw new Error("Esta solicitação não está aguardando autorização final.");
  await prisma.trocaOP.update({
    where: { id: trocaId },
    data: { status: "REJEITADO_FINAL", analiseProadFinalOk: false, analiseProadFinalMotivo: motivo, analiseProadFinalEm: new Date() },
  });
  revalidatePath("/admin/entrega");
  revalidatePath(`/dfd/${troca.itemDfd.dfdId}`);
}

export async function todasTrocasOPPendentes() {
  const [triagem, autorizacaoFinal] = await Promise.all([
    prisma.trocaOP.findMany({
      where: { status: "PENDENTE_PROAD_INICIAL" },
      include: { itemDfd: { include: { dfd: { include: { unidade: true } } } } },
      orderBy: { solicitadoEm: "asc" },
    }),
    prisma.trocaOP.findMany({
      where: { status: "PENDENTE_PROAD_FINAL" },
      include: { itemDfd: { include: { dfd: { include: { unidade: true } } } } },
      orderBy: { solicitadoEm: "asc" },
    }),
  ]);
  return { triagem, autorizacaoFinal };
}

export async function trocasOPParaVerificarDisponibilidade() {
  return prisma.trocaOP.findMany({
    where: { status: "PENDENTE_PATRIMONIO" },
    include: { itemDfd: { include: { dfd: { include: { unidade: true } } } }, itemBCategoria: true },
    orderBy: { solicitadoEm: "asc" },
  });
}

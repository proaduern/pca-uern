"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirUnidade } from "@/lib/auth";
import { calcularGastos, janelaAberta, saldoPCA, saldoUnidadeGeral, saldoUnidadeOP } from "@/lib/cota";
import {
  validarDescricaoSumaria,
  validarItemDfd,
  validarJustificativa,
} from "@/lib/dfd-validacao";
import { brl } from "@/lib/formato";
import { categoriaVisivelPara, itemCatalogoVisivelPara } from "@/lib/visibilidade";
import type { Dfd, ItemDfd, Unidade } from "@prisma/client";

type StatusComprometido = "AGUARDANDO_APROVACAO" | "APROVADO";
const STATUS_COMPROMETEM_ORCAMENTO: StatusComprometido[] = ["AGUARDANDO_APROVACAO", "APROVADO"];

/** Gastos já comprometidos (fora do DFD em edição) de uma unidade, em todos os anos. */
async function gastosComprometidosDaUnidade(unidadeId: string) {
  const itens = await prisma.itemDfd.findMany({
    where: { dfd: { unidadeId, status: { in: STATUS_COMPROMETEM_ORCAMENTO } } },
    select: { enquadramento: true, valorTotal: true },
  });
  return calcularGastos(itens.map((it) => ({ enquadramento: it.enquadramento, valorTotal: Number(it.valorTotal) })));
}

/** Gastos comprometidos por todas as unidades no ano do PCA (para os subsaldos institucionais). */
async function gastosComprometidosDoPca(ano: number) {
  const itens = await prisma.itemDfd.findMany({
    where: { dfd: { ano, status: { in: STATUS_COMPROMETEM_ORCAMENTO } } },
    select: { enquadramento: true, valorTotal: true },
  });
  return calcularGastos(itens.map((it) => ({ enquadramento: it.enquadramento, valorTotal: Number(it.valorTotal) })));
}

/** Gasto comprometido numa categoria específica, no ano do PCA (para o teto `saldoAnualGlobal`). */
async function gastoComprometidoDaCategoria(categoriaId: string, ano: number) {
  const itens = await prisma.itemDfd.findMany({
    where: { categoriaId, dfd: { ano, status: { in: STATUS_COMPROMETEM_ORCAMENTO } } },
    select: { valorTotal: true },
  });
  return itens.reduce((soma, it) => soma + Number(it.valorTotal), 0);
}

async function obterPcaAtivoOuErro() {
  const pca = await prisma.pca.findFirst({ where: { ativo: true } });
  if (!pca) throw new Error("Nenhum PCA ativo no momento. Aguarde a liberação da PROAD.");
  return pca;
}

async function verificarJanelaOuErro(unidadeId: string, pcaAno: number) {
  const pca = await prisma.pca.findUniqueOrThrow({ where: { ano: pcaAno } });
  const excecao = await prisma.pcaExcecao.findUnique({
    where: { pcaAno_unidadeId: { pcaAno, unidadeId } },
  });
  if (!janelaAberta(pca, !!excecao, new Date())) {
    throw new Error(
      `O período de lançamento de demandas para o PCA ${pcaAno} está fechado no momento.`,
    );
  }
}

async function obterDfdDaUnidadeOuErro(dfdId: string, unidadeId: string) {
  const dfd = await prisma.dfd.findUnique({ where: { id: dfdId }, include: { itens: true } });
  if (!dfd || dfd.unidadeId !== unidadeId) throw new Error("DFD não encontrado.");
  if (dfd.status !== "RASCUNHO" && dfd.status !== "REPROVADO") {
    throw new Error("Este DFD não pode mais ser editado.");
  }
  return dfd;
}

/**
 * A PROAD pode editar qualquer DFD, em qualquer status — igual ao sistema
 * original. Se o DFD já estava aprovado, a edição o devolve para
 * "aguardando aprovação": evita que fique valendo com itens diferentes dos
 * que a PROAD revisou, forçando uma nova conferência antes de seguir.
 */
async function reverterAprovacaoSeNecessario(dfd: { id: string; status: string }) {
  if (dfd.status === "APROVADO") {
    await prisma.dfd.update({
      where: { id: dfd.id },
      data: { status: "AGUARDANDO_APROVACAO", aprovadoEm: null },
    });
  }
}

export async function criarRascunhoDfdAction() {
  const sessao = await exigirUnidade();
  const pca = await obterPcaAtivoOuErro();
  await verificarJanelaOuErro(sessao.id, pca.ano);

  const prioridade = await prisma.prioridade.findFirst();
  if (!prioridade) {
    throw new Error("Nenhuma prioridade cadastrada ainda. Peça à PROAD para cadastrar.");
  }

  const dfd = await prisma.dfd.create({
    data: {
      unidadeId: sessao.id,
      ano: pca.ano,
      descricaoSumaria: "",
      prioridadeId: prioridade.id,
      justificativa: "",
      tipoDemanda: "NOVA",
      status: "RASCUNHO",
      criadoPorId: sessao.id,
    },
  });

  redirect(`/dfd/${dfd.id}`);
}

async function processarAtualizacaoDadosGerais(dfdId: string, formData: FormData) {
  const descricaoSumaria = String(formData.get("descricaoSumaria") ?? "").trim();
  const tipificacaoId = String(formData.get("tipificacaoId") ?? "") || null;
  const prioridadeId = String(formData.get("prioridadeId") ?? "");
  const justificativa = String(formData.get("justificativa") ?? "").trim();
  const tipoDemanda = String(formData.get("tipoDemanda") ?? "") as
    | "RENOVACAO"
    | "NOVA"
    | "FLUXO_CONTINUO";
  const data = String(formData.get("data") ?? "");

  const erroDescricao = validarDescricaoSumaria(descricaoSumaria);
  if (erroDescricao) throw new Error(erroDescricao);
  const erroJustificativa = validarJustificativa(justificativa);
  if (erroJustificativa) throw new Error(erroJustificativa);
  if (!tipificacaoId) throw new Error("Selecione a tipificação do problema.");
  if (!prioridadeId) throw new Error("Selecione a prioridade.");
  if (!tipoDemanda) throw new Error("Selecione a natureza da demanda.");
  if (!data) throw new Error("Informe a data.");

  await prisma.dfd.update({
    where: { id: dfdId },
    data: {
      descricaoSumaria,
      tipificacaoId,
      prioridadeId,
      justificativa,
      tipoDemanda,
      dataRenovacao: tipoDemanda === "RENOVACAO" ? new Date(data) : null,
      dataEntrega: tipoDemanda !== "RENOVACAO" ? new Date(data) : null,
    },
  });
}

export async function atualizarDadosGeraisDfdAction(dfdId: string, formData: FormData) {
  const sessao = await exigirUnidade();
  await obterDfdDaUnidadeOuErro(dfdId, sessao.id);
  await processarAtualizacaoDadosGerais(dfdId, formData);
  revalidatePath(`/dfd/${dfdId}`);
}

export async function adminAtualizarDadosGeraisDfdAction(dfdId: string, formData: FormData) {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId } });
  await processarAtualizacaoDadosGerais(dfdId, formData);
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath(`/dfd/${dfdId}`);
}

async function processarAdicaoItem(
  dfd: Dfd & { itens: ItemDfd[] },
  unidade: Unidade,
  formData: FormData,
) {
  const dfdId = dfd.id;
  const tipo = String(formData.get("tipo") ?? "MATERIAL") as "MATERIAL" | "SERVICO";
  const enquadramento = String(formData.get("enquadramento") ?? "GERAL") as
    | "OP"
    | "GERAL"
    | "CONVENIO";
  const convenioNumero = String(formData.get("convenioNumero") ?? "").trim() || null;
  const convenioAnoRaw = String(formData.get("convenioAno") ?? "").trim();
  const convenioAno = convenioAnoRaw ? Number(convenioAnoRaw) : null;
  const emendaParlamentar = formData.get("emendaParlamentar") === "on";
  const parlamentarNome = String(formData.get("parlamentarNome") ?? "").trim() || null;
  const categoriaId = String(formData.get("categoriaId") ?? "") || null;
  const itemCatalogoId = String(formData.get("itemCatalogoId") ?? "") || null;
  const itemNomeLivreInput = String(formData.get("itemNomeLivre") ?? "").trim() || null;
  const quantidadeRaw = String(formData.get("quantidade") ?? "").trim();
  const quantidade = quantidadeRaw ? Number(quantidadeRaw) : null;
  const valorLivreRaw = String(formData.get("valorLivre") ?? "").trim();
  const correlacao = String(formData.get("correlacao") ?? "").trim();

  if (!categoriaId) throw new Error("Selecione a categoria do item.");
  const categoria = await prisma.categoria.findUnique({
    where: { id: categoriaId },
    include: { unidadesRestritas: { select: { id: true } } },
  });
  if (!categoria || !categoriaVisivelPara(categoria, unidade.id)) {
    throw new Error("Categoria não encontrada.");
  }

  let itemCatalogoNome: string | null = null;
  let valorUnit: number | null = null;
  let valorTotal: number;
  let tipoBem: "CONSUMO" | "PERMANENTE" | null = null;

  if (itemCatalogoId) {
    const itemCatalogo = await prisma.itemCatalogo.findUnique({
      where: { id: itemCatalogoId },
      include: { unidadesRestritas: { select: { id: true } } },
    });
    if (
      !itemCatalogo ||
      itemCatalogo.categoriaId !== categoriaId ||
      !itemCatalogoVisivelPara(itemCatalogo, categoria, unidade.id)
    ) {
      throw new Error("Item de catálogo não encontrado.");
    }
    itemCatalogoNome = itemCatalogo.item;
    valorUnit = Number(itemCatalogo.valor);
    tipoBem = itemCatalogo.tipoBem;
    valorTotal = valorUnit * (quantidade ?? 1);
  } else {
    valorTotal = Number(valorLivreRaw || 0);
    // Regra do sistema original: material de valor livre da categoria "Livros"
    // sempre conta como bem permanente (as demais categorias de valor livre
    // não têm tipo de bem, por não passarem pelo catálogo).
    if (tipo === "MATERIAL" && categoria.nome === "Livros") {
      tipoBem = "PERMANENTE";
    }
  }

  const itemNomeLivre = itemCatalogoId ? null : itemNomeLivreInput;

  const erro = validarItemDfd(
    {
      tipo,
      enquadramento,
      convenioNumero,
      convenioAno,
      emendaParlamentar,
      parlamentarNome,
      categoriaId,
      itemCatalogoNome,
      itemNomeLivre,
      quantidade,
      valorUnit,
      valorTotal,
      correlacao,
    },
    unidade.elegivelCotaOP,
  );
  if (erro) throw new Error(erro);

  if (enquadramento !== "CONVENIO") {
    const pca = await prisma.pca.findUniqueOrThrow({ where: { ano: dfd.ano } });
    const jaNoDfd = calcularGastos(
      dfd.itens.map((it) => ({ enquadramento: it.enquadramento, valorTotal: Number(it.valorTotal) })),
    );
    const [gastoUnidade, gastoPca] = await Promise.all([
      gastosComprometidosDaUnidade(unidade.id),
      gastosComprometidosDoPca(dfd.ano),
    ]);

    if (categoria.saldoAnualGlobal != null) {
      const jaGastoCategoria = await gastoComprometidoDaCategoria(categoriaId, dfd.ano);
      const jaNoDfdCategoria = dfd.itens
        .filter((it) => it.categoriaId === categoriaId)
        .reduce((soma, it) => soma + Number(it.valorTotal), 0);
      const saldoCategoria = Number(categoria.saldoAnualGlobal) - jaGastoCategoria - jaNoDfdCategoria;
      if (valorTotal > saldoCategoria) {
        throw new Error(
          `Valor excede o saldo anual disponível para a categoria "${categoria.nome}" (${brl(saldoCategoria)}).`,
        );
      }
    }

    if (enquadramento === "OP") {
      const saldoOP = saldoUnidadeOP(Number(unidade.cotaOP), gastoUnidade.op + jaNoDfd.op);
      if (valorTotal > saldoOP) {
        throw new Error(`Valor excede o saldo de Cota OP disponível da unidade (${brl(saldoOP)}).`);
      }
      if (!categoria.ignoraPCA) {
        const saldoOPPCA = saldoUnidadeOP(Number(pca.cotaOP), gastoPca.op + jaNoDfd.op);
        if (valorTotal > saldoOPPCA) {
          throw new Error(
            `Valor excede o subsaldo OP disponível no PCA como um todo (${brl(saldoOPPCA)}).`,
          );
        }
      }
    } else {
      const temTetoNaUnidade =
        (!unidade.elegivelCotaOP && unidade.cotaTipo === "FECHADA") ||
        (unidade.elegivelCotaOP && Number(unidade.cotaGeral) > 0);
      if (temTetoNaUnidade) {
        const saldoGeralU = saldoUnidadeGeral(Number(unidade.cotaGeral), gastoUnidade.geral + jaNoDfd.geral);
        if (valorTotal > saldoGeralU) {
          throw new Error(
            `Valor excede o saldo de Cota Geral disponível da unidade (${brl(saldoGeralU)}).`,
          );
        }
      }
    }

    if (!categoria.ignoraPCA) {
      const saldoPCAAtual = saldoPCA(Number(pca.cotaGeral), gastoPca.total + jaNoDfd.total);
      if (valorTotal > saldoPCAAtual) {
        throw new Error(`Valor excede o saldo disponível da Cota PCA Geral (${brl(saldoPCAAtual)}).`);
      }
    }
  }

  await prisma.itemDfd.create({
    data: {
      dfdId,
      tipo,
      enquadramento,
      convenioNumero,
      convenioAno,
      emendaParlamentar,
      parlamentarNome,
      categoriaId,
      itemCatalogoNome,
      itemNomeLivre,
      tipoBem,
      quantidade,
      valorUnit,
      valorTotal,
      correlacao,
    },
  });
}

export async function adicionarItemDfdAction(dfdId: string, formData: FormData) {
  const sessao = await exigirUnidade();
  const dfd = await obterDfdDaUnidadeOuErro(dfdId, sessao.id);
  const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: sessao.id } });
  await processarAdicaoItem(dfd, unidade, formData);
  revalidatePath(`/dfd/${dfdId}`);
}

export async function adminAdicionarItemDfdAction(dfdId: string, formData: FormData) {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId }, include: { itens: true } });
  const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: dfd.unidadeId } });
  await processarAdicaoItem(dfd, unidade, formData);
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath(`/dfd/${dfdId}`);
}

async function processarRemocaoItem(dfdId: string, itemId: string) {
  const { count } = await prisma.itemDfd.deleteMany({ where: { id: itemId, dfdId } });
  if (count === 0) throw new Error("Item não encontrado neste DFD.");
}

export async function removerItemDfdAction(dfdId: string, itemId: string) {
  const sessao = await exigirUnidade();
  await obterDfdDaUnidadeOuErro(dfdId, sessao.id);
  await processarRemocaoItem(dfdId, itemId);
  revalidatePath(`/dfd/${dfdId}`);
}

export async function adminRemoverItemDfdAction(dfdId: string, itemId: string) {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId } });
  await processarRemocaoItem(dfdId, itemId);
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath(`/dfd/${dfdId}`);
}

export async function enviarParaAprovacaoAction(dfdId: string) {
  const sessao = await exigirUnidade();
  const dfd = await obterDfdDaUnidadeOuErro(dfdId, sessao.id);
  await verificarJanelaOuErro(sessao.id, dfd.ano);

  if (validarDescricaoSumaria(dfd.descricaoSumaria)) {
    throw new Error("Preencha a descrição sumária antes de enviar.");
  }
  if (validarJustificativa(dfd.justificativa)) {
    throw new Error("A justificativa precisa ter pelo menos 100 caracteres antes de enviar.");
  }
  if (dfd.itens.length === 0) {
    throw new Error("Adicione ao menos um item antes de enviar para aprovação.");
  }

  await prisma.dfd.update({
    where: { id: dfdId },
    data: {
      status: "AGUARDANDO_APROVACAO",
      enviadoParaAprovacaoEm: new Date(),
      motivoReprovacao: null,
      reprovadoEm: null,
    },
  });

  revalidatePath("/");
  redirect("/");
}

export async function excluirDfdAction(dfdId: string) {
  const sessao = await exigirUnidade();
  await obterDfdDaUnidadeOuErro(dfdId, sessao.id);
  await prisma.dfd.delete({ where: { id: dfdId } });
  revalidatePath("/");
  redirect("/");
}

/**
 * Exclusão de DFD pela PROAD, sem restrição de status — o sistema original
 * também não impõe nenhuma (é uma tela client-only), então a única guarda
 * aqui é a de papel administrativo.
 */
export async function adminExcluirDfdAction(dfdId: string) {
  await exigirAdmin();
  await prisma.dfd.delete({ where: { id: dfdId } });
  revalidatePath("/admin/demandas");
  revalidatePath("/");
}

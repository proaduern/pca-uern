"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirUnidade } from "@/lib/auth";
import { janelaAberta } from "@/lib/cota";
import {
  validarDescricaoSumaria,
  validarItemDfd,
  validarJustificativa,
} from "@/lib/dfd-validacao";

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

export async function atualizarDadosGeraisDfdAction(dfdId: string, formData: FormData) {
  const sessao = await exigirUnidade();
  await obterDfdDaUnidadeOuErro(dfdId, sessao.id);

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

  revalidatePath(`/dfd/${dfdId}`);
}

export async function adicionarItemDfdAction(dfdId: string, formData: FormData) {
  const sessao = await exigirUnidade();
  await obterDfdDaUnidadeOuErro(dfdId, sessao.id);
  const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: sessao.id } });

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

  let itemCatalogoNome: string | null = null;
  let valorUnit: number | null = null;
  let valorTotal: number;
  let tipoBem: "CONSUMO" | "PERMANENTE" | null = null;

  if (itemCatalogoId) {
    const itemCatalogo = await prisma.itemCatalogo.findUniqueOrThrow({
      where: { id: itemCatalogoId },
    });
    itemCatalogoNome = itemCatalogo.item;
    valorUnit = Number(itemCatalogo.valor);
    tipoBem = itemCatalogo.tipoBem;
    valorTotal = valorUnit * (quantidade ?? 1);
  } else {
    valorTotal = Number(valorLivreRaw || 0);
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

  await prisma.itemDfd.create({
    data: {
      dfdId,
      tipo,
      enquadramento,
      convenioNumero,
      convenioAno,
      emendaParlamentar,
      parlamentarNome,
      categoriaId: categoriaId!,
      itemCatalogoNome,
      itemNomeLivre,
      tipoBem,
      quantidade,
      valorUnit,
      valorTotal,
      correlacao,
    },
  });

  revalidatePath(`/dfd/${dfdId}`);
}

export async function removerItemDfdAction(dfdId: string, itemId: string) {
  const sessao = await exigirUnidade();
  await obterDfdDaUnidadeOuErro(dfdId, sessao.id);
  await prisma.itemDfd.delete({ where: { id: itemId } });
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

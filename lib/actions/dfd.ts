"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAdmin, exigirUnidade, type SessionPayload } from "@/lib/auth";
import { resolverPcaEmAtuacao } from "@/lib/pca-contexto";
import {
  arredondarCentavos,
  calcularGastos,
  janelaAberta,
  saldoPCA,
  saldoUnidadeGeral,
  saldoUnidadeOP,
} from "@/lib/cota";
import {
  validarDataDentroDoAno,
  validarDescricaoSumaria,
  validarItemDfd,
  validarJustificativa,
} from "@/lib/dfd-validacao";
import { brl } from "@/lib/formato";
import { categoriaVisivelPara, itemCatalogoVisivelPara } from "@/lib/visibilidade";
import type { Dfd, ItemDfd, Pca, Unidade } from "@prisma/client";
import type { ResultadoAcao } from "./tipos";

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
  return arredondarCentavos(itens.reduce((soma, it) => soma + Number(it.valorTotal), 0));
}

/** O PCA em que a unidade escolheu atuar (ou o único ativo, se só houver um). */
async function resolverPcaAtuacao(
  sessao: Pick<SessionPayload, "id" | "tipo">,
): Promise<{ erro: string } | { pca: Pca }> {
  const contexto = await resolverPcaEmAtuacao(sessao);
  if (contexto.status === "nenhum") {
    return { erro: "Nenhum PCA ativo no momento. Aguarde a liberação da PROAD." };
  }
  if (contexto.status === "precisa_escolher") {
    return { erro: "Selecione em qual PCA você está atuando antes de continuar." };
  }
  return { pca: contexto.pca };
}

async function verificarJanela(unidadeId: string, pcaAno: number): Promise<string | null> {
  const pca = await prisma.pca.findUniqueOrThrow({ where: { ano: pcaAno } });
  const excecao = await prisma.pcaExcecao.findUnique({
    where: { pcaAno_unidadeId: { pcaAno, unidadeId } },
  });
  if (!janelaAberta(pca, !!excecao, new Date())) {
    return `O período de lançamento de demandas para o PCA ${pcaAno} está fechado no momento.`;
  }
  return null;
}

type DfdComItens = Dfd & { itens: ItemDfd[] };

async function obterDfdDaUnidade(
  dfdId: string,
  unidadeId: string,
): Promise<{ erro: string } | { dfd: DfdComItens }> {
  const dfd = await prisma.dfd.findUnique({ where: { id: dfdId }, include: { itens: true } });
  if (!dfd || dfd.unidadeId !== unidadeId) return { erro: "DFD não encontrado." };
  if (dfd.status !== "RASCUNHO" && dfd.status !== "REPROVADO") {
    return { erro: "Este DFD não pode mais ser editado." };
  }
  return { dfd };
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

export interface ResultadoCriarDfd extends ResultadoAcao {
  dfdId?: string;
}

export async function criarRascunhoDfdAction(): Promise<ResultadoCriarDfd> {
  const sessao = await exigirUnidade();
  const resultadoPca = await resolverPcaAtuacao(sessao);
  if ("erro" in resultadoPca) return { erro: resultadoPca.erro };
  const { pca } = resultadoPca;

  const erroJanela = await verificarJanela(sessao.id, pca.ano);
  if (erroJanela) return { erro: erroJanela };

  const prioridade = await prisma.prioridade.findFirst();
  if (!prioridade) {
    return { erro: "Nenhuma prioridade cadastrada ainda. Peça à PROAD para cadastrar." };
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

  return { dfdId: dfd.id };
}

function validarDadosGerais(
  formData: FormData,
  ano: number,
): { erro: string } | { dados: Parameters<typeof prisma.dfd.update>[0]["data"] } {
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
  if (erroDescricao) return { erro: erroDescricao };
  const erroJustificativa = validarJustificativa(justificativa);
  if (erroJustificativa) return { erro: erroJustificativa };
  if (!tipificacaoId) return { erro: "Selecione a tipificação do problema." };
  if (!prioridadeId) return { erro: "Selecione a prioridade." };
  if (!tipoDemanda) return { erro: "Selecione a natureza da demanda." };
  if (!data) return { erro: "Informe a data." };
  // A trava de ano só vale para a data pretendida de entrega — a data de
  // renovação de contrato não tem essa restrição.
  if (tipoDemanda !== "RENOVACAO") {
    const erroData = validarDataDentroDoAno(data, ano);
    if (erroData) return { erro: erroData };
  }

  return {
    dados: {
      descricaoSumaria,
      tipificacaoId,
      prioridadeId,
      justificativa,
      tipoDemanda,
      dataRenovacao: tipoDemanda === "RENOVACAO" ? new Date(data) : null,
      dataEntrega: tipoDemanda !== "RENOVACAO" ? new Date(data) : null,
    },
  };
}

async function processarAtualizacaoDadosGerais(dfdId: string, ano: number, formData: FormData): Promise<ResultadoAcao> {
  const resultado = validarDadosGerais(formData, ano);
  if ("erro" in resultado) return { erro: resultado.erro };
  await prisma.dfd.update({ where: { id: dfdId }, data: resultado.dados });
  return {};
}

export async function atualizarDadosGeraisDfdAction(dfdId: string, formData: FormData): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const resultadoDfd = await obterDfdDaUnidade(dfdId, sessao.id);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const resultado = await processarAtualizacaoDadosGerais(dfdId, resultadoDfd.dfd.ano, formData);
  if (resultado.erro) return resultado;
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

export async function adminAtualizarDadosGeraisDfdAction(dfdId: string, formData: FormData): Promise<ResultadoAcao> {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId } });
  const resultado = await processarAtualizacaoDadosGerais(dfdId, dfd.ano, formData);
  if (resultado.erro) return resultado;
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

async function processarAdicaoItem(
  dfd: Dfd & { itens: ItemDfd[] },
  unidade: Unidade,
  formData: FormData,
): Promise<ResultadoAcao> {
  const dfdId = dfd.id;
  const tipo = String(formData.get("tipo") ?? "MATERIAL") as "MATERIAL" | "SERVICO";
  const enquadramento = String(formData.get("enquadramento") ?? "GERAL") as
    | "OP"
    | "GERAL"
    | "CONVENIO"
    | "RECURSOS_EXTRA";
  const convenioNumero = String(formData.get("convenioNumero") ?? "").trim() || null;
  const convenioAnoRaw = String(formData.get("convenioAno") ?? "").trim();
  const convenioAno = convenioAnoRaw ? Number(convenioAnoRaw) : null;
  const emendaParlamentar = formData.get("emendaParlamentar") === "on";
  const parlamentarNome = String(formData.get("parlamentarNome") ?? "").trim() || null;
  const recursoExtraAgencia = String(formData.get("recursoExtraAgencia") ?? "").trim() || null;
  const recursoExtraConta = String(formData.get("recursoExtraConta") ?? "").trim() || null;
  const categoriaId = String(formData.get("categoriaId") ?? "") || null;
  const itemCatalogoId = String(formData.get("itemCatalogoId") ?? "") || null;
  const itemNomeLivreInput = String(formData.get("itemNomeLivre") ?? "").trim() || null;
  const quantidadeRaw = String(formData.get("quantidade") ?? "").trim();
  const quantidade = quantidadeRaw ? Number(quantidadeRaw) : null;
  const valorLivreRaw = String(formData.get("valorLivre") ?? "").trim();
  const correlacao = String(formData.get("correlacao") ?? "").trim();

  if (!categoriaId) return { erro: "Selecione a categoria do item." };
  const categoria = await prisma.categoria.findUnique({
    where: { id: categoriaId },
    include: { unidadesRestritas: { select: { id: true } } },
  });
  if (!categoria || !categoriaVisivelPara(categoria, unidade.id)) {
    return { erro: "Categoria não encontrada." };
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
      return { erro: "Item de catálogo não encontrado." };
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
      recursoExtraAgencia,
      recursoExtraConta,
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
  if (erro) return { erro };

  // Convênio e Recursos Extra são recursos externos à unidade: não disputam
  // cota OP/Geral nem o subsaldo do PCA (ver lib/cota.ts).
  if (enquadramento !== "CONVENIO" && enquadramento !== "RECURSOS_EXTRA") {
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
      const jaNoDfdCategoria = arredondarCentavos(
        dfd.itens
          .filter((it) => it.categoriaId === categoriaId)
          .reduce((soma, it) => soma + Number(it.valorTotal), 0),
      );
      const saldoCategoria = arredondarCentavos(
        Number(categoria.saldoAnualGlobal) - jaGastoCategoria - jaNoDfdCategoria,
      );
      if (valorTotal > saldoCategoria) {
        return {
          erro: `Valor excede o saldo anual disponível para a categoria "${categoria.nome}" (${brl(saldoCategoria)}).`,
        };
      }
    }

    if (enquadramento === "OP") {
      const saldoOP = saldoUnidadeOP(Number(unidade.cotaOP), gastoUnidade.op + jaNoDfd.op);
      if (valorTotal > saldoOP) {
        return { erro: `Valor excede o saldo de Cota OP disponível da unidade (${brl(saldoOP)}).` };
      }
      if (!categoria.ignoraPCA) {
        const saldoOPPCA = saldoUnidadeOP(Number(pca.cotaOP), gastoPca.op + jaNoDfd.op);
        if (valorTotal > saldoOPPCA) {
          return {
            erro: `Valor excede o subsaldo OP disponível no PCA como um todo (${brl(saldoOPPCA)}).`,
          };
        }
      }
    } else {
      const temTetoNaUnidade =
        (!unidade.elegivelCotaOP && unidade.cotaTipo === "FECHADA") ||
        (unidade.elegivelCotaOP && Number(unidade.cotaGeral) > 0);
      if (temTetoNaUnidade) {
        const saldoGeralU = saldoUnidadeGeral(Number(unidade.cotaGeral), gastoUnidade.geral + jaNoDfd.geral);
        if (valorTotal > saldoGeralU) {
          return {
            erro: `Valor excede o saldo de Cota Geral disponível da unidade (${brl(saldoGeralU)}).`,
          };
        }
      }
    }

    if (!categoria.ignoraPCA) {
      const saldoPCAAtual = saldoPCA(Number(pca.cotaGeral), gastoPca.total + jaNoDfd.total);
      if (valorTotal > saldoPCAAtual) {
        return { erro: `Valor excede o saldo disponível da Cota PCA Geral (${brl(saldoPCAAtual)}).` };
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
      recursoExtraAgencia,
      recursoExtraConta,
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
  return {};
}

export async function adicionarItemDfdAction(dfdId: string, formData: FormData): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const resultadoDfd = await obterDfdDaUnidade(dfdId, sessao.id);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: sessao.id } });
  const resultado = await processarAdicaoItem(resultadoDfd.dfd, unidade, formData);
  if (resultado.erro) return resultado;
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

export async function adminAdicionarItemDfdAction(dfdId: string, formData: FormData): Promise<ResultadoAcao> {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId }, include: { itens: true } });
  const unidade = await prisma.unidade.findUniqueOrThrow({ where: { id: dfd.unidadeId } });
  const resultado = await processarAdicaoItem(dfd, unidade, formData);
  if (resultado.erro) return resultado;
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

async function processarRemocaoItem(dfdId: string, itemId: string): Promise<ResultadoAcao> {
  const { count } = await prisma.itemDfd.deleteMany({ where: { id: itemId, dfdId } });
  if (count === 0) return { erro: "Item não encontrado neste DFD." };
  return {};
}

export async function removerItemDfdAction(dfdId: string, itemId: string): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const resultadoDfd = await obterDfdDaUnidade(dfdId, sessao.id);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const resultado = await processarRemocaoItem(dfdId, itemId);
  if (resultado.erro) return resultado;
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

export async function adminRemoverItemDfdAction(dfdId: string, itemId: string): Promise<ResultadoAcao> {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId } });
  const resultado = await processarRemocaoItem(dfdId, itemId);
  if (resultado.erro) return resultado;
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

export async function enviarParaAprovacaoAction(dfdId: string): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const resultadoDfd = await obterDfdDaUnidade(dfdId, sessao.id);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const { dfd } = resultadoDfd;
  const erroJanela = await verificarJanela(sessao.id, dfd.ano);
  if (erroJanela) return { erro: erroJanela };

  if (validarDescricaoSumaria(dfd.descricaoSumaria)) {
    return { erro: "Preencha a descrição sumária antes de enviar." };
  }
  if (validarJustificativa(dfd.justificativa)) {
    return { erro: "A justificativa precisa ter pelo menos 100 caracteres antes de enviar." };
  }
  if (dfd.itens.length === 0) {
    return { erro: "Adicione ao menos um item antes de enviar para aprovação." };
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

export async function excluirDfdAction(dfdId: string): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const resultadoDfd = await obterDfdDaUnidade(dfdId, sessao.id);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  await prisma.dfd.delete({ where: { id: dfdId } });
  revalidatePath("/");
  redirect("/");
}

/**
 * Exclusão de DFD pela PROAD, sem restrição de status — o sistema original
 * também não impõe nenhuma (é uma tela client-only), então a única guarda
 * aqui é a de papel administrativo.
 */
export async function adminExcluirDfdAction(dfdId: string): Promise<ResultadoAcao> {
  await exigirAdmin();
  await prisma.dfd.delete({ where: { id: dfdId } });
  revalidatePath("/admin/demandas");
  revalidatePath("/");
  return {};
}

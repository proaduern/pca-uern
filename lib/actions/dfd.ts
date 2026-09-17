"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  exigirAdmin,
  exigirSetorInterno,
  exigirUnidade,
  exigirUnidadeOuSetorInterno,
  type SessionPayload,
} from "@/lib/auth";
import { resolverPcaEmAtuacao } from "@/lib/pca-contexto";
import {
  arredondarCentavos,
  calcularGastos,
  janelaAberta,
  precisaAutorizacaoCotaGeralOP,
  saldoPCA,
  saldoUnidadeGeral,
  saldoUnidadeOP,
} from "@/lib/cota";
import {
  validarDataDentroDoAno,
  validarDescricaoSumaria,
  validarItemDfd,
  validarJustificativa,
  validarJustificativaCotaGeral,
} from "@/lib/dfd-validacao";
import { brl } from "@/lib/formato";
import {
  categoriaVisivelPara,
  itemCatalogoVisivelPara,
} from "@/lib/visibilidade";
import type { Categoria, Dfd, ItemDfd, Pca, Unidade } from "@prisma/client";
import type { ResultadoAcao } from "./tipos";

type StatusComprometido = "AGUARDANDO_APROVACAO" | "APROVADO";
const STATUS_COMPROMETEM_ORCAMENTO: StatusComprometido[] = [
  "AGUARDANDO_APROVACAO",
  "APROVADO",
];

/** Gastos já comprometidos (fora do DFD em edição) de uma unidade, em todos os anos. */
async function gastosComprometidosDaUnidade(unidadeId: string) {
  const itens = await prisma.itemDfd.findMany({
    where: { dfd: { unidadeId, status: { in: STATUS_COMPROMETEM_ORCAMENTO } } },
    select: { enquadramento: true, valorTotal: true },
  });
  return calcularGastos(
    itens.map((it) => ({
      enquadramento: it.enquadramento,
      valorTotal: Number(it.valorTotal),
    })),
  );
}

/** Gastos comprometidos por todas as unidades no ano do PCA (para os subsaldos institucionais). */
async function gastosComprometidosDoPca(ano: number) {
  const itens = await prisma.itemDfd.findMany({
    where: { dfd: { ano, status: { in: STATUS_COMPROMETEM_ORCAMENTO } } },
    select: { enquadramento: true, valorTotal: true },
  });
  return calcularGastos(
    itens.map((it) => ({
      enquadramento: it.enquadramento,
      valorTotal: Number(it.valorTotal),
    })),
  );
}

/** Gasto comprometido numa categoria específica, no ano do PCA (para o teto `saldoAnualGlobal`). */
async function gastoComprometidoDaCategoria(categoriaId: string, ano: number) {
  const itens = await prisma.itemDfd.findMany({
    where: {
      categoriaId,
      dfd: { ano, status: { in: STATUS_COMPROMETEM_ORCAMENTO } },
    },
    select: { valorTotal: true },
  });
  return arredondarCentavos(
    itens.reduce((soma, it) => soma + Number(it.valorTotal), 0),
  );
}

/** Gastos já comprometidos por um setor interno específico (sub-teto rígido
 * dentro da cota da própria unidade — ver ContextoDfd/processarAdicaoItem). */
async function gastosComprometidosDoSetorInterno(setorInternoId: string) {
  const itens = await prisma.itemDfd.findMany({
    where: {
      dfd: { setorInternoId, status: { in: STATUS_COMPROMETEM_ORCAMENTO } },
    },
    select: { enquadramento: true, valorTotal: true },
  });
  return calcularGastos(
    itens.map((it) => ({
      enquadramento: it.enquadramento,
      valorTotal: Number(it.valorTotal),
    })),
  );
}

/** O PCA em que a unidade escolheu atuar (ou o único ativo, se só houver um). */
async function resolverPcaAtuacao(
  sessao: Pick<SessionPayload, "id" | "tipo">,
): Promise<{ erro: string } | { pca: Pca }> {
  const contexto = await resolverPcaEmAtuacao(sessao);
  if (contexto.status === "nenhum") {
    return {
      erro: "Nenhum PCA ativo no momento. Aguarde a liberação da PROAD.",
    };
  }
  if (contexto.status === "precisa_escolher") {
    return {
      erro: "Selecione em qual PCA você está atuando antes de continuar.",
    };
  }
  return { pca: contexto.pca };
}

async function verificarJanela(
  unidadeId: string,
  pcaAno: number,
): Promise<string | null> {
  const pca = await prisma.pca.findUniqueOrThrow({ where: { ano: pcaAno } });
  const excecao = await prisma.pcaExcecao.findUnique({
    where: { pcaAno_unidadeId: { pcaAno, unidadeId } },
  });
  if (!janelaAberta(pca, !!excecao, new Date())) {
    return `O período de lançamento de demandas para o PCA ${pcaAno} está fechado no momento.`;
  }
  return null;
}

interface ContextoDfd {
  unidadeId: string;
  setorInternoId: string | null;
}

/** DFD é sempre da unidade (unidadeId); setorInternoId, quando presente, é
 * quem de fato está autenticado (um dos setores internos dela). */
async function resolverContextoDfd(
  sessao: SessionPayload,
): Promise<ContextoDfd> {
  if (sessao.tipo === "UNIDADE")
    return { unidadeId: sessao.id, setorInternoId: null };
  const setor = await prisma.setorInterno.findUniqueOrThrow({
    where: { id: sessao.id },
  });
  return { unidadeId: setor.unidadeId, setorInternoId: setor.id };
}

type DfdComItens = Dfd & { itens: ItemDfd[] };

async function obterDfdParaEdicao(
  dfdId: string,
  ctx: ContextoDfd,
): Promise<{ erro: string } | { dfd: DfdComItens }> {
  const dfd = await prisma.dfd.findUnique({
    where: { id: dfdId },
    include: { itens: true },
  });
  if (!dfd || dfd.unidadeId !== ctx.unidadeId)
    return { erro: "DFD não encontrado." };
  // Um setor interno só mexe nos DFDs que ele mesmo criou (a unidade continua
  // vendo e editando todos, próprios e dos seus setores). Uma vez enviado
  // para a revisão da unidade, o setor perde a edição até ela reabrir.
  if (ctx.setorInternoId) {
    if (dfd.setorInternoId !== ctx.setorInternoId)
      return { erro: "DFD não encontrado." };
    if (dfd.enviadoParaUnidadeEm) {
      return {
        erro: "Este DFD já foi enviado para revisão da unidade e não pode mais ser editado pelo setor.",
      };
    }
  }
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
async function reverterAprovacaoSeNecessario(dfd: {
  id: string;
  status: string;
}) {
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
  const sessao = await exigirUnidadeOuSetorInterno();
  const ctx = await resolverContextoDfd(sessao);
  const resultadoPca = await resolverPcaAtuacao(sessao);
  if ("erro" in resultadoPca) return { erro: resultadoPca.erro };
  const { pca } = resultadoPca;

  const erroJanela = await verificarJanela(ctx.unidadeId, pca.ano);
  if (erroJanela) return { erro: erroJanela };

  const prioridade = await prisma.prioridade.findFirst();
  if (!prioridade) {
    return {
      erro: "Nenhuma prioridade cadastrada ainda. Peça à PROAD para cadastrar.",
    };
  }

  // Número sequencial do DFD dentro da unidade/ano (ex.: "0007/2027"), usado
  // no cabeçalho do PDF oficial — atribuído uma única vez, aqui, e nunca
  // reaproveitado mesmo se um DFD anterior da sequência for excluído.
  const dfd = await prisma.$transaction(async (tx) => {
    const ultimo = await tx.dfd.findFirst({
      where: { unidadeId: ctx.unidadeId, ano: pca.ano },
      orderBy: { numero: "desc" },
      select: { numero: true },
    });
    return tx.dfd.create({
      data: {
        unidadeId: ctx.unidadeId,
        setorInternoId: ctx.setorInternoId,
        ano: pca.ano,
        numero: (ultimo?.numero ?? 0) + 1,
        descricaoSumaria: "",
        prioridadeId: prioridade.id,
        justificativa: "",
        tipoDemanda: "NOVA",
        status: "RASCUNHO",
        criadoPorId: sessao.id,
      },
    });
  });

  return { dfdId: dfd.id };
}

function validarDadosGerais(
  formData: FormData,
  ano: number,
):
  | { erro: string }
  | { dados: Parameters<typeof prisma.dfd.update>[0]["data"] } {
  const descricaoSumaria = String(
    formData.get("descricaoSumaria") ?? "",
  ).trim();
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

async function processarAtualizacaoDadosGerais(
  dfdId: string,
  ano: number,
  formData: FormData,
): Promise<ResultadoAcao> {
  const resultado = validarDadosGerais(formData, ano);
  if ("erro" in resultado) return { erro: resultado.erro };
  await prisma.dfd.update({ where: { id: dfdId }, data: resultado.dados });
  return {};
}

export async function atualizarDadosGeraisDfdAction(
  dfdId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await exigirUnidadeOuSetorInterno();
  const ctx = await resolverContextoDfd(sessao);
  const resultadoDfd = await obterDfdParaEdicao(dfdId, ctx);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const resultado = await processarAtualizacaoDadosGerais(
    dfdId,
    resultadoDfd.dfd.ano,
    formData,
  );
  if (resultado.erro) return resultado;
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

export async function adminAtualizarDadosGeraisDfdAction(
  dfdId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId } });
  const resultado = await processarAtualizacaoDadosGerais(
    dfdId,
    dfd.ano,
    formData,
  );
  if (resultado.erro) return resultado;
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

interface ItemBasicoResolvido {
  tipo: "MATERIAL" | "SERVICO";
  categoriaId: string;
  categoria: Categoria & { unidadesRestritas: { id: string }[] };
  itemCatalogoId: string | null;
  itemCatalogoNome: string | null;
  itemNomeLivre: string | null;
  tipoBem: "CONSUMO" | "PERMANENTE" | null;
  quantidade: number | null;
  valorUnit: number | null;
  valorTotal: number;
  itemLiberadoCotaGeralOP: boolean;
}

/**
 * Resolve categoria + item (catálogo ou valor livre) + valor total a partir
 * do FormData do assistente de item — compartilhado entre a adição direta do
 * item (processarAdicaoItem) e o pedido de autorização de Cota Geral
 * (solicitarAutorizacaoCotaGeralAction), que precisa dos mesmos dados para
 * registrar exatamente o item que a unidade pretende lançar.
 */
async function resolverItemBasico(
  unidade: Unidade,
  formData: FormData,
): Promise<{ erro: string } | { dados: ItemBasicoResolvido }> {
  const tipo = String(formData.get("tipo") ?? "MATERIAL") as
    | "MATERIAL"
    | "SERVICO";
  const categoriaId = String(formData.get("categoriaId") ?? "") || null;
  const itemCatalogoId = String(formData.get("itemCatalogoId") ?? "") || null;
  const itemNomeLivreInput =
    String(formData.get("itemNomeLivre") ?? "").trim() || null;
  const quantidadeRaw = String(formData.get("quantidade") ?? "").trim();
  const quantidade = quantidadeRaw ? Number(quantidadeRaw) : null;
  const valorLivreRaw = String(formData.get("valorLivre") ?? "").trim();

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
  let itemLiberadoCotaGeralOP = false;

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
    itemLiberadoCotaGeralOP = itemCatalogo.liberadoCotaGeralParaOP;
  } else {
    valorTotal = Number(valorLivreRaw || 0);
    // Material de valor livre não passa por ItemCatalogo (que carregaria seu
    // próprio tipoBem), então herda o tipo de bem fixado no cadastro da
    // categoria — ver Categoria.tipoBemPadrao.
    if (tipo === "MATERIAL") {
      tipoBem = categoria.tipoBemPadrao;
    }
  }

  const itemNomeLivre = itemCatalogoId ? null : itemNomeLivreInput;

  return {
    dados: {
      tipo,
      categoriaId,
      categoria,
      itemCatalogoId,
      itemCatalogoNome,
      itemNomeLivre,
      tipoBem,
      quantidade,
      valorUnit,
      valorTotal,
      itemLiberadoCotaGeralOP,
    },
  };
}

const MENSAGEM_BLOQUEIO_COTA_GERAL_OP =
  "Unidades elegíveis à Cota OP só podem lançar itens em Cota Geral na categoria Climatização ou nos itens de carteira escolar liberados em Mobília. Para outra categoria/item, justifique a necessidade e solicite autorização da PROAD abaixo.";

export interface ResultadoAdicionarItem extends ResultadoAcao {
  requerAutorizacaoCotaGeral?: boolean;
}

async function processarAdicaoItem(
  dfd: Dfd & { itens: ItemDfd[] },
  unidade: Unidade,
  formData: FormData,
  opcoes?: { autorizadoExcecaoCotaGeralOP?: boolean },
): Promise<ResultadoAdicionarItem> {
  const dfdId = dfd.id;
  const enquadramento = String(formData.get("enquadramento") ?? "GERAL") as
    | "OP"
    | "GERAL"
    | "CONVENIO"
    | "RECURSOS_EXTRA";
  const convenioNumero =
    String(formData.get("convenioNumero") ?? "").trim() || null;
  const convenioAnoRaw = String(formData.get("convenioAno") ?? "").trim();
  const convenioAno = convenioAnoRaw ? Number(convenioAnoRaw) : null;
  const emendaParlamentar = formData.get("emendaParlamentar") === "on";
  const parlamentarNome =
    String(formData.get("parlamentarNome") ?? "").trim() || null;
  const recursoExtraAgencia =
    String(formData.get("recursoExtraAgencia") ?? "").trim() || null;
  const recursoExtraConta =
    String(formData.get("recursoExtraConta") ?? "").trim() || null;
  const correlacao = String(formData.get("correlacao") ?? "").trim();

  const resolvidoItem = await resolverItemBasico(unidade, formData);
  if ("erro" in resolvidoItem) return { erro: resolvidoItem.erro };
  const {
    tipo,
    categoriaId,
    categoria,
    itemCatalogoNome,
    itemNomeLivre,
    tipoBem,
    quantidade,
    valorUnit,
    valorTotal,
    itemLiberadoCotaGeralOP,
  } = resolvidoItem.dados;

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

  if (
    !opcoes?.autorizadoExcecaoCotaGeralOP &&
    precisaAutorizacaoCotaGeralOP(
      unidade.elegivelCotaOP,
      enquadramento,
      categoria.liberadaCotaGeralParaOP,
      itemLiberadoCotaGeralOP,
    )
  ) {
    return {
      erro: MENSAGEM_BLOQUEIO_COTA_GERAL_OP,
      requerAutorizacaoCotaGeral: true,
    };
  }

  // Convênio e Recursos Extra são recursos externos à unidade: não disputam
  // cota OP/Geral nem o subsaldo do PCA (ver lib/cota.ts).
  if (enquadramento !== "CONVENIO" && enquadramento !== "RECURSOS_EXTRA") {
    const pca = await prisma.pca.findUniqueOrThrow({ where: { ano: dfd.ano } });
    const jaNoDfd = calcularGastos(
      dfd.itens.map((it) => ({
        enquadramento: it.enquadramento,
        valorTotal: Number(it.valorTotal),
      })),
    );
    const [gastoUnidade, gastoPca] = await Promise.all([
      gastosComprometidosDaUnidade(unidade.id),
      gastosComprometidosDoPca(dfd.ano),
    ]);

    if (categoria.saldoAnualGlobal != null) {
      const jaGastoCategoria = await gastoComprometidoDaCategoria(
        categoriaId,
        dfd.ano,
      );
      const jaNoDfdCategoria = arredondarCentavos(
        dfd.itens
          .filter((it) => it.categoriaId === categoriaId)
          .reduce((soma, it) => soma + Number(it.valorTotal), 0),
      );
      const saldoCategoria = arredondarCentavos(
        Number(categoria.saldoAnualGlobal) -
          jaGastoCategoria -
          jaNoDfdCategoria,
      );
      if (valorTotal > saldoCategoria) {
        return {
          erro: `Valor excede o saldo anual disponível para a categoria "${categoria.nome}" (${brl(saldoCategoria)}).`,
        };
      }
    }

    if (enquadramento === "OP") {
      const saldoOP = saldoUnidadeOP(
        Number(unidade.cotaOP),
        gastoUnidade.op + jaNoDfd.op,
      );
      if (valorTotal > saldoOP) {
        return {
          erro: `Valor excede o saldo de Cota OP disponível da unidade (${brl(saldoOP)}).`,
        };
      }
      if (!categoria.ignoraPCA) {
        const saldoOPPCA = saldoUnidadeOP(
          Number(pca.cotaOP),
          gastoPca.op + jaNoDfd.op,
        );
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
        const saldoGeralU = saldoUnidadeGeral(
          Number(unidade.cotaGeral),
          gastoUnidade.geral + jaNoDfd.geral,
        );
        if (valorTotal > saldoGeralU) {
          return {
            erro: `Valor excede o saldo de Cota Geral disponível da unidade (${brl(saldoGeralU)}).`,
          };
        }
      }
    }

    if (!categoria.ignoraPCA) {
      const saldoPCAAtual = saldoPCA(
        Number(pca.cotaGeral),
        gastoPca.total + jaNoDfd.total,
      );
      if (valorTotal > saldoPCAAtual) {
        return {
          erro: `Valor excede o saldo disponível da Cota PCA Geral (${brl(saldoPCAAtual)}).`,
        };
      }
    }

    // Sub-teto do setor interno: uma fatia fixa da cota da própria unidade
    // (ver SetorInterno em prisma/schema.prisma) — some gasto igual às
    // checagens acima, só que restrito aos DFDs deste setor.
    if (dfd.setorInternoId) {
      const setorInterno = await prisma.setorInterno.findUniqueOrThrow({
        where: { id: dfd.setorInternoId },
      });
      const gastoSetor = await gastosComprometidosDoSetorInterno(
        dfd.setorInternoId,
      );
      if (enquadramento === "OP") {
        const saldoOPSetor = saldoUnidadeOP(
          Number(setorInterno.cotaOP),
          gastoSetor.op + jaNoDfd.op,
        );
        if (valorTotal > saldoOPSetor) {
          return {
            erro: `Valor excede o saldo de Cota OP disponível do setor interno (${brl(saldoOPSetor)}).`,
          };
        }
      } else {
        const saldoGeralSetor = saldoUnidadeGeral(
          Number(setorInterno.cotaGeral),
          gastoSetor.geral + jaNoDfd.geral,
        );
        if (valorTotal > saldoGeralSetor) {
          return {
            erro: `Valor excede o saldo de Cota Geral disponível do setor interno (${brl(saldoGeralSetor)}).`,
          };
        }
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

export async function adicionarItemDfdAction(
  dfdId: string,
  formData: FormData,
): Promise<ResultadoAdicionarItem> {
  const sessao = await exigirUnidadeOuSetorInterno();
  const ctx = await resolverContextoDfd(sessao);
  const resultadoDfd = await obterDfdParaEdicao(dfdId, ctx);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const unidade = await prisma.unidade.findUniqueOrThrow({
    where: { id: ctx.unidadeId },
  });
  const resultado = await processarAdicaoItem(
    resultadoDfd.dfd,
    unidade,
    formData,
  );
  if (resultado.erro) return resultado;
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

export async function adminAdicionarItemDfdAction(
  dfdId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({
    where: { id: dfdId },
    include: { itens: true },
  });
  const unidade = await prisma.unidade.findUniqueOrThrow({
    where: { id: dfd.unidadeId },
  });
  // A PROAD já É a autoridade que autorizaria a exceção — adicionar manualmente
  // não passa pela trava de Cota Geral fora da liberação padrão (ver
  // MENSAGEM_BLOQUEIO_COTA_GERAL_OP acima).
  const resultado = await processarAdicaoItem(dfd, unidade, formData, {
    autorizadoExcecaoCotaGeralOP: true,
  });
  if (resultado.erro) return resultado;
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

/**
 * Unidade justifica e pede autorização da PROAD para lançar, em Cota Geral,
 * um item de categoria/item fora da liberação padrão (bloqueado por
 * processarAdicaoItem acima) — mesmos dados do item já preenchidos no
 * formulário do assistente, mais a justificativa.
 */
export async function solicitarAutorizacaoCotaGeralAction(
  dfdId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await exigirUnidadeOuSetorInterno();
  const ctx = await resolverContextoDfd(sessao);
  const resultadoDfd = await obterDfdParaEdicao(dfdId, ctx);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const unidade = await prisma.unidade.findUniqueOrThrow({
    where: { id: ctx.unidadeId },
  });

  const justificativa = String(formData.get("justificativa") ?? "").trim();
  const erroJustificativa = validarJustificativaCotaGeral(justificativa);
  if (erroJustificativa) return { erro: erroJustificativa };

  const correlacao = String(formData.get("correlacao") ?? "").trim();

  const resolvidoItem = await resolverItemBasico(unidade, formData);
  if ("erro" in resolvidoItem) return { erro: resolvidoItem.erro };
  const {
    tipo,
    categoriaId,
    categoria,
    itemCatalogoId,
    itemCatalogoNome,
    itemNomeLivre,
    quantidade,
    valorUnit,
    valorTotal,
    itemLiberadoCotaGeralOP,
  } = resolvidoItem.dados;

  const erro = validarItemDfd(
    {
      tipo,
      enquadramento: "GERAL",
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

  if (
    !precisaAutorizacaoCotaGeralOP(
      unidade.elegivelCotaOP,
      "GERAL",
      categoria.liberadaCotaGeralParaOP,
      itemLiberadoCotaGeralOP,
    )
  ) {
    return {
      erro: "Este item já pode ser lançado diretamente em Cota Geral, sem necessidade de autorização.",
    };
  }

  await prisma.solicitacaoAutorizacaoCotaGeral.create({
    data: {
      unidadeId: unidade.id,
      dfdId: resultadoDfd.dfd.id,
      tipo,
      categoriaId,
      itemCatalogoId,
      itemNomeLivre,
      quantidade,
      valorTotal,
      correlacao,
      justificativa,
    },
  });
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

/**
 * PROAD aceita a solicitação: cria o item diretamente no DFD de origem,
 * ignorando só a trava de categoria/item (as demais checagens de cota/saldo
 * continuam valendo — a exceção é sobre o enquadramento, não sobre dinheiro).
 */
export async function aceitarSolicitacaoAutorizacaoCotaGeralAction(
  solicitacaoId: string,
): Promise<ResultadoAcao> {
  await exigirAdmin();
  const solicitacao =
    await prisma.solicitacaoAutorizacaoCotaGeral.findUniqueOrThrow({
      where: { id: solicitacaoId },
    });
  if (solicitacao.status !== "PENDENTE")
    return { erro: "Esta solicitação já foi analisada." };

  const dfd = await prisma.dfd.findUnique({
    where: { id: solicitacao.dfdId },
    include: { itens: true },
  });
  if (!dfd) return { erro: "O DFD desta solicitação não existe mais." };
  const unidade = await prisma.unidade.findUniqueOrThrow({
    where: { id: solicitacao.unidadeId },
  });

  const fd = new FormData();
  fd.set("tipo", solicitacao.tipo);
  fd.set("enquadramento", "GERAL");
  fd.set("categoriaId", solicitacao.categoriaId);
  if (solicitacao.itemCatalogoId)
    fd.set("itemCatalogoId", solicitacao.itemCatalogoId);
  if (solicitacao.itemNomeLivre)
    fd.set("itemNomeLivre", solicitacao.itemNomeLivre);
  if (solicitacao.quantidade != null)
    fd.set("quantidade", String(solicitacao.quantidade));
  if (!solicitacao.itemCatalogoId)
    fd.set("valorLivre", String(solicitacao.valorTotal));
  fd.set("correlacao", solicitacao.correlacao);

  const resultado = await processarAdicaoItem(dfd, unidade, fd, {
    autorizadoExcecaoCotaGeralOP: true,
  });
  if (resultado.erro) return { erro: resultado.erro };

  await prisma.solicitacaoAutorizacaoCotaGeral.update({
    where: { id: solicitacaoId },
    data: { status: "ACEITO", analisadoEm: new Date() },
  });
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath("/admin/solicitacoes-cota-geral");
  revalidatePath(`/dfd/${dfd.id}`);
  return {};
}

export async function rejeitarSolicitacaoAutorizacaoCotaGeralAction(
  solicitacaoId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  await exigirAdmin();
  const solicitacao =
    await prisma.solicitacaoAutorizacaoCotaGeral.findUniqueOrThrow({
      where: { id: solicitacaoId },
    });
  if (solicitacao.status !== "PENDENTE")
    return { erro: "Esta solicitação já foi analisada." };

  const motivo = String(formData.get("motivo") ?? "").trim() || null;
  await prisma.solicitacaoAutorizacaoCotaGeral.update({
    where: { id: solicitacaoId },
    data: {
      status: "REJEITADO",
      motivoRejeicao: motivo,
      analisadoEm: new Date(),
    },
  });
  revalidatePath("/admin/solicitacoes-cota-geral");
  return {};
}

async function processarRemocaoItem(
  dfdId: string,
  itemId: string,
): Promise<ResultadoAcao> {
  const { count } = await prisma.itemDfd.deleteMany({
    where: { id: itemId, dfdId },
  });
  if (count === 0) return { erro: "Item não encontrado neste DFD." };
  return {};
}

export async function removerItemDfdAction(
  dfdId: string,
  itemId: string,
): Promise<ResultadoAcao> {
  const sessao = await exigirUnidadeOuSetorInterno();
  const ctx = await resolverContextoDfd(sessao);
  const resultadoDfd = await obterDfdParaEdicao(dfdId, ctx);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const resultado = await processarRemocaoItem(dfdId, itemId);
  if (resultado.erro) return resultado;
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

export async function adminRemoverItemDfdAction(
  dfdId: string,
  itemId: string,
): Promise<ResultadoAcao> {
  await exigirAdmin();
  const dfd = await prisma.dfd.findUniqueOrThrow({ where: { id: dfdId } });
  const resultado = await processarRemocaoItem(dfdId, itemId);
  if (resultado.erro) return resultado;
  await reverterAprovacaoSeNecessario(dfd);
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

function validarConteudoParaEnvio(dfd: {
  descricaoSumaria: string;
  justificativa: string;
  itens: unknown[];
}): string | null {
  if (validarDescricaoSumaria(dfd.descricaoSumaria)) {
    return "Preencha a descrição sumária antes de enviar.";
  }
  if (validarJustificativa(dfd.justificativa)) {
    return "A justificativa precisa ter pelo menos 100 caracteres antes de enviar.";
  }
  if (dfd.itens.length === 0) {
    return "Adicione ao menos um item antes de enviar para aprovação.";
  }
  return null;
}

/**
 * Só a Unidade libera para a PROAD (nunca o setor interno diretamente — ver
 * enviarParaUnidadeAction) — mas isso vale tanto para os DFDs da própria
 * Unidade quanto para os de qualquer um dos seus setores internos, já que
 * ela sempre tem acesso pleno a tudo que tem o seu unidadeId.
 */
export async function enviarParaAprovacaoAction(
  dfdId: string,
): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const resultadoDfd = await obterDfdParaEdicao(dfdId, {
    unidadeId: sessao.id,
    setorInternoId: null,
  });
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const { dfd } = resultadoDfd;
  const erroJanela = await verificarJanela(sessao.id, dfd.ano);
  if (erroJanela) return { erro: erroJanela };

  const erroConteudo = validarConteudoParaEnvio(dfd);
  if (erroConteudo) return { erro: erroConteudo };

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

/** Setor interno não fala direto com a PROAD: só manda para a revisão da
 * própria Unidade, que decide se libera (enviarParaAprovacaoAction) ou
 * devolve para o setor ajustar (reabrirParaSetorAction). */
export async function enviarParaUnidadeAction(
  dfdId: string,
): Promise<ResultadoAcao> {
  const sessao = await exigirSetorInterno();
  const ctx = await resolverContextoDfd(sessao);
  const resultadoDfd = await obterDfdParaEdicao(dfdId, ctx);
  if ("erro" in resultadoDfd) return { erro: resultadoDfd.erro };
  const { dfd } = resultadoDfd;
  const erroJanela = await verificarJanela(ctx.unidadeId, dfd.ano);
  if (erroJanela) return { erro: erroJanela };

  const erroConteudo = validarConteudoParaEnvio(dfd);
  if (erroConteudo) return { erro: erroConteudo };

  await prisma.dfd.update({
    where: { id: dfdId },
    data: { enviadoParaUnidadeEm: new Date() },
  });

  revalidatePath("/");
  redirect("/");
}

/** A Unidade devolve ao setor interno para continuar editando (ex.: pediu
 * algum ajuste antes de liberar para a PROAD). */
export async function reabrirParaSetorAction(
  dfdId: string,
): Promise<ResultadoAcao> {
  const sessao = await exigirUnidade();
  const dfd = await prisma.dfd.findUnique({ where: { id: dfdId } });
  if (!dfd || dfd.unidadeId !== sessao.id || !dfd.setorInternoId) {
    return { erro: "DFD não encontrado." };
  }
  await prisma.dfd.update({
    where: { id: dfdId },
    data: { enviadoParaUnidadeEm: null },
  });
  revalidatePath(`/dfd/${dfdId}`);
  return {};
}

export async function excluirDfdAction(dfdId: string): Promise<ResultadoAcao> {
  const sessao = await exigirUnidadeOuSetorInterno();
  const ctx = await resolverContextoDfd(sessao);
  const resultadoDfd = await obterDfdParaEdicao(dfdId, ctx);
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
export async function adminExcluirDfdAction(
  dfdId: string,
): Promise<ResultadoAcao> {
  await exigirAdmin();
  await prisma.dfd.delete({ where: { id: dfdId } });
  revalidatePath("/admin/demandas");
  revalidatePath("/");
  return {};
}

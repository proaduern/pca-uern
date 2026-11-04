"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPesquisaPrecos } from "@/lib/auth";
import { extrairTextoPdf } from "@/lib/pdf-extrair-texto";
import { validarPesquisaPrecosParaFinalizar, type DadosPesquisaPrecoItem } from "@/lib/pesquisa-precos";
import { extrairCotacaoBancoPrecosXlsx } from "@/lib/pesquisa-precos-banco";
import { avancarStatusLicitacaoSeNecessario } from "./avancar-status";
import type { ResultadoAcao } from "./tipos";

export interface ResultadoIniciarPesquisaPrecos extends ResultadoAcao {
  pesquisaDePrecosId?: string;
}

export interface ResultadoImportarBancoPrecos extends ResultadoAcao {
  itensAtualizados?: DadosPesquisaPrecoItem[];
  responsavelNome?: string | null;
  responsavelMatricula?: string | null;
  metodologia?: string;
  resumoImportacao?: string;
}

async function montarItensConsolidadosDaConsolidacao(consolidacaoTecnicaId: string) {
  const [itensDfd, itensTecnicos] = await Promise.all([
    prisma.itemDfd.findMany({ where: { consolidacaoTecnicaId } }),
    prisma.itemTecnico.findMany({ where: { consolidacaoTecnicaId } }),
  ]);

  const mapa = new Map<string, number>();
  for (const it of itensDfd) {
    const nome = (it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)").trim();
    mapa.set(nome, (mapa.get(nome) ?? 0) + Number(it.quantidade ?? 1));
  }
  for (const it of itensTecnicos) {
    const nome = it.item.trim();
    mapa.set(nome, (mapa.get(nome) ?? 0) + Number(it.quantidade ?? 1));
  }

  return [...mapa.entries()].map(([item, quantidade]) => ({ item, quantidade }));
}

/**
 * Cria a Pesquisa de Preços da consolidação (com ou sem PDF inicial) —
 * idempotente: se já existir, só devolve o id existente.
 * Os itens são pré-carregados e consolidados a partir da própria ConsolidacaoTecnica.
 */
export async function iniciarPesquisaPrecosAction(
  consolidacaoTecnicaId: string,
  formData?: FormData,
): Promise<ResultadoIniciarPesquisaPrecos> {
  await exigirPesquisaPrecos();

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({ where: { id: consolidacaoTecnicaId } });
  if (!consolidacao) return { erro: "Consolidação não encontrada." };

  const existente = await prisma.pesquisaDePrecos.findUnique({ where: { consolidacaoTecnicaId } });
  if (existente) return { pesquisaDePrecosId: existente.id };

  let arquivoPdfNome: string | null = null;
  let textoExtraido: string | null = null;

  const arquivo = formData?.get("arquivo");
  if (arquivo instanceof File && arquivo.size > 0) {
    arquivoPdfNome = arquivo.name;
    try {
      textoExtraido = await extrairTextoPdf(arquivo);
    } catch (e) {
      return { erro: e instanceof Error ? e.message : "Não foi possível ler o PDF enviado." };
    }
  }

  const metodologia =
    String(formData?.get("metodologia") ?? "").trim() ||
    "Pesquisa de preços realizada em conformidade com o art. 23 da Lei nº 14.133/2021 e IN SEGES/ME nº 65/2021, utilizando o Sistema Banco de Preços.";

  const itens = await montarItensConsolidadosDaConsolidacao(consolidacaoTecnicaId);
  if (itens.length === 0) return { erro: "Esta consolidação não tem itens para pesquisar preços." };

  const pesquisa = await prisma.pesquisaDePrecos.create({
    data: {
      consolidacaoTecnicaId,
      metodologia,
      arquivoPdfNome,
      arquivoPdfTexto: textoExtraido,
      itens: {
        create: itens.map((it, ordem) => ({
          ordem,
          item: it.item,
          quantidade: it.quantidade,
          fontesConsultadas: "Sistema Banco de Preços",
        })),
      },
    },
  });

  revalidatePath(`/pesquisa-precos/${consolidacaoTecnicaId}`);
  return { pesquisaDePrecosId: pesquisa.id };
}

async function obterPesquisaEditavelOuErro(pesquisaDePrecosId: string) {
  const pesquisa = await prisma.pesquisaDePrecos.findUnique({
    where: { id: pesquisaDePrecosId },
    include: { consolidacaoTecnica: true, itens: { orderBy: { ordem: "asc" } } },
  });
  if (!pesquisa) return { erro: "Pesquisa de Preços não encontrada." };
  if (pesquisa.status === "FINALIZADO") {
    return { erro: "Esta Pesquisa de Preços já foi finalizada e não pode mais ser editada." };
  }
  return { pesquisa };
}

function normalizarNomeComparacao(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Importa a planilha de Relatório de Cotação gerada pelo Sistema Banco de Preços (.xlsx),
 * extraindo o Preço Estimado da Coluna E para cada item correspondente do processo.
 */
export async function importarPlanilhaBancoPrecosAction(
  pesquisaDePrecosId: string,
  formData: FormData,
): Promise<ResultadoImportarBancoPrecos> {
  await exigirPesquisaPrecos();
  const resultado = await obterPesquisaEditavelOuErro(pesquisaDePrecosId);
  if ("erro" in resultado) return { erro: resultado.erro };

  const arquivo = formData.get("arquivoXlsx");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Selecione a planilha (.xlsx) gerada pelo Sistema Banco de Preços." };
  }

  let extraido;
  try {
    const arrayBuffer = await arquivo.arrayBuffer();
    extraido = await extrairCotacaoBancoPrecosXlsx(arrayBuffer);
  } catch (e) {
    return {
      erro: e instanceof Error ? e.message : "Não foi possível ler a planilha do Banco de Preços.",
    };
  }

  const { pesquisa } = resultado;
  const itensBanco = extraido.itensCotados;
  const usados = new Set<number>();
  let totalItensImportados = 0;

  const fontePadrao = [
    "Sistema Banco de Preços",
    extraido.periodoPesquisa ? `(${extraido.periodoPesquisa})` : null,
  ]
    .filter(Boolean)
    .join(" ");

  const novosDados = pesquisa.itens.map((itemSistema, idx) => {
    const nomeNormSistema = normalizarNomeComparacao(itemSistema.item);

    // 1º tenta casar pelo nome normalizado exato ou contido
    let matchIdx = itensBanco.findIndex(
      (ib, bIdx) =>
        !usados.has(bIdx) &&
        normalizarNomeComparacao(ib.nome) !== "" &&
        (normalizarNomeComparacao(ib.nome) === nomeNormSistema ||
          normalizarNomeComparacao(ib.nome).includes(nomeNormSistema) ||
          nomeNormSistema.includes(normalizarNomeComparacao(ib.nome))),
    );

    // 2º se não casou por nome, casa pela ordem sequencial do item (Coluna A = Item 1, 2, 3...)
    if (matchIdx === -1) {
      matchIdx = itensBanco.findIndex((ib, bIdx) => !usados.has(bIdx) && ib.itemOrdem === idx + 1);
    }

    // 3º fallback por posição direta se a quantidade de itens for a mesma
    if (matchIdx === -1 && idx < itensBanco.length && !usados.has(idx)) {
      matchIdx = idx;
    }

    if (matchIdx !== -1) {
      usados.add(matchIdx);
      const cotado = itensBanco[matchIdx];
      if (cotado.precoEstimadoColE > 0) {
        totalItensImportados++;
        return {
          id: itemSistema.id,
          item: itemSistema.item,
          quantidade: Number(itemSistema.quantidade),
          valorUnitarioPesquisado: cotado.precoEstimadoColE,
          medianaPesquisada: cotado.precoEstimadoColE,
          fontesConsultadas: itemSistema.fontesConsultadas?.trim() || fontePadrao,
        };
      }
    }

    return {
      id: itemSistema.id,
      item: itemSistema.item,
      quantidade: Number(itemSistema.quantidade),
      valorUnitarioPesquisado: Number(itemSistema.valorUnitarioPesquisado),
      medianaPesquisada:
        itemSistema.medianaPesquisada === null ? null : Number(itemSistema.medianaPesquisada),
      fontesConsultadas: itemSistema.fontesConsultadas,
    };
  });

  if (totalItensImportados === 0) {
    return {
      erro: "Nenhum preço estimado válido (maior que zero) foi encontrado na Coluna E para os itens deste processo.",
    };
  }

  const novoResponsavelNome = pesquisa.responsavelNome || extraido.responsavelNome || null;
  const novaResponsavelMatricula =
    pesquisa.responsavelMatricula || extraido.responsavelMatricula || null;
  const novaMetodologia =
    pesquisa.metodologia?.trim() ||
    `Pesquisa de preços realizada no Sistema Banco de Preços (art. 23 da Lei nº 14.133/2021). ${extraido.periodoPesquisa ?? ""} ${extraido.relatorioGerado ?? ""}`.trim();

  await prisma.$transaction([
    ...novosDados.map((d) =>
      prisma.pesquisaPrecoItem.update({
        where: { id: d.id },
        data: {
          valorUnitarioPesquisado: d.valorUnitarioPesquisado,
          medianaPesquisada: d.medianaPesquisada,
          fontesConsultadas: d.fontesConsultadas,
        },
      }),
    ),
    prisma.pesquisaDePrecos.update({
      where: { id: pesquisa.id },
      data: {
        arquivoPdfNome: arquivo.name,
        responsavelNome: novoResponsavelNome,
        responsavelMatricula: novaResponsavelMatricula,
        metodologia: novaMetodologia,
      },
    }),
  ]);

  revalidatePath(`/pesquisa-precos/${pesquisa.consolidacaoTecnicaId}`);

  return {
    itensAtualizados: novosDados.map((d) => ({
      item: d.item,
      quantidade: d.quantidade,
      valorUnitarioPesquisado: d.valorUnitarioPesquisado,
      medianaPesquisada: d.medianaPesquisada,
      fontesConsultadas: d.fontesConsultadas,
    })),
    responsavelNome: novoResponsavelNome,
    responsavelMatricula: novaResponsavelMatricula,
    metodologia: novaMetodologia,
    resumoImportacao: `Planilha "${arquivo.name}" importada com sucesso! ${totalItensImportados} de ${pesquisa.itens.length} item(ns) tiveram o Preço Estimado (Coluna E) preenchido automaticamente.`,
  };
}

interface ItemEditavel {
  valorUnitarioPesquisado: number;
  medianaPesquisada: number | null;
  fontesConsultadas: string;
}

function parseItensEditaveisJson(itensJson: string): { erro: string } | { itens: ItemEditavel[] } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(itensJson);
  } catch {
    return { erro: "Lista de itens inválida." };
  }
  if (!Array.isArray(bruto)) return { erro: "Lista de itens inválida." };

  const itens: ItemEditavel[] = [];
  for (const linha of bruto) {
    if (typeof linha !== "object" || linha === null) return { erro: "Lista de itens inválida." };
    const l = linha as Record<string, unknown>;
    const valorUnitarioPesquisado = Number(l.valorUnitarioPesquisado);
    if (!Number.isFinite(valorUnitarioPesquisado) || valorUnitarioPesquisado < 0) {
      return { erro: "Valor unitário pesquisado inválido." };
    }
    const medianaBruta = l.medianaPesquisada;
    let medianaPesquisada: number | null = null;
    if (medianaBruta !== null && medianaBruta !== undefined && medianaBruta !== "") {
      medianaPesquisada = Number(medianaBruta);
      if (!Number.isFinite(medianaPesquisada) || medianaPesquisada < 0) {
        return { erro: "Mediana pesquisada inválida." };
      }
    }
    itens.push({
      valorUnitarioPesquisado,
      medianaPesquisada,
      fontesConsultadas: String(l.fontesConsultadas ?? "").trim(),
    });
  }
  return { itens };
}

async function salvarValoresItens(
  itensExistentes: { id: string }[],
  editaveis: ItemEditavel[],
): Promise<string | null> {
  if (itensExistentes.length !== editaveis.length) return "A lista de itens não confere com a consolidação.";
  await prisma.$transaction(
    itensExistentes.map((it, i) =>
      prisma.pesquisaPrecoItem.update({
        where: { id: it.id },
        data: editaveis[i],
      }),
    ),
  );
  return null;
}

/** Salva a Pesquisa de Preços como rascunho — sem exigir todos os valores preenchidos. */
export async function salvarPesquisaPrecosRascunhoAction(
  pesquisaDePrecosId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  await exigirPesquisaPrecos();
  const resultado = await obterPesquisaEditavelOuErro(pesquisaDePrecosId);
  if ("erro" in resultado) return { erro: resultado.erro };

  const parse = parseItensEditaveisJson(String(formData.get("itensJson") ?? "[]"));
  if ("erro" in parse) return { erro: parse.erro };

  const erroItens = await salvarValoresItens(resultado.pesquisa.itens, parse.itens);
  if (erroItens) return { erro: erroItens };

  const metodologia = String(formData.get("metodologia") ?? "").trim();
  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim() || null;
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim() || null;

  await prisma.pesquisaDePrecos.update({
    where: { id: pesquisaDePrecosId },
    data: { metodologia, responsavelNome, responsavelMatricula },
  });

  revalidatePath(`/pesquisa-precos/${resultado.pesquisa.consolidacaoTecnicaId}`);
  return {};
}

/**
 * Valida todos os itens, a metodologia e o responsável, conclui a Pesquisa de Preços
 * e devolve o processo ao Agente de Contratação (para solicitação de dotação orçamentária à Contabilidade).
 */
export async function finalizarPesquisaPrecosAction(
  pesquisaDePrecosId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  await exigirPesquisaPrecos();
  const resultado = await obterPesquisaEditavelOuErro(pesquisaDePrecosId);
  if ("erro" in resultado) return { erro: resultado.erro };

  const parse = parseItensEditaveisJson(String(formData.get("itensJson") ?? "[]"));
  if ("erro" in parse) return { erro: parse.erro };
  if (resultado.pesquisa.itens.length !== parse.itens.length) {
    return { erro: "A lista de itens não confere com a consolidação." };
  }

  const metodologia = String(formData.get("metodologia") ?? "").trim();
  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim();
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim();

  const itensParaValidar: DadosPesquisaPrecoItem[] = resultado.pesquisa.itens.map((it, i) => ({
    item: it.item,
    quantidade: Number(it.quantidade),
    valorUnitarioPesquisado: parse.itens[i].valorUnitarioPesquisado,
    medianaPesquisada: parse.itens[i].medianaPesquisada,
    fontesConsultadas: parse.itens[i].fontesConsultadas,
  }));
  const erro = validarPesquisaPrecosParaFinalizar(itensParaValidar, metodologia, responsavelNome, responsavelMatricula);
  if (erro) return { erro };

  const erroItens = await salvarValoresItens(resultado.pesquisa.itens, parse.itens);
  if (erroItens) return { erro: erroItens };

  await prisma.$transaction([
    prisma.pesquisaDePrecos.update({
      where: { id: pesquisaDePrecosId },
      data: { metodologia, responsavelNome, responsavelMatricula, status: "FINALIZADO", finalizadoEm: new Date() },
    }),
    prisma.consolidacaoTecnica.update({
      where: { id: resultado.pesquisa.consolidacaoTecnicaId },
      data: {
        etapaFluxoPosEtp: "AGUARDANDO_DOTACAO_ORCAMENTARIA",
        pesquisaConcluidaRetornadaAgenteEm: new Date(),
      },
    }),
  ]);

  await avancarStatusLicitacaoSeNecessario(
    resultado.pesquisa.consolidacaoTecnicaId,
    "PESQUISA_PRECOS",
    responsavelNome,
  );

  revalidatePath(`/pesquisa-precos/${resultado.pesquisa.consolidacaoTecnicaId}`);
  revalidatePath(`/agente-contratacao/${resultado.pesquisa.consolidacaoTecnicaId}`);
  revalidatePath(`/licitacoes/${resultado.pesquisa.consolidacaoTecnicaId}`);
  revalidatePath("/");
  return {};
}

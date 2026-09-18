"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPesquisaPrecos } from "@/lib/auth";
import { extrairTextoPdf } from "@/lib/pdf-extrair-texto";
import { validarPesquisaPrecosParaFinalizar, type DadosPesquisaPrecoItem } from "@/lib/pesquisa-precos";
import { avancarStatusLicitacaoSeNecessario } from "./avancar-status";
import type { ResultadoAcao } from "./tipos";

export interface ResultadoIniciarPesquisaPrecos extends ResultadoAcao {
  pesquisaDePrecosId?: string;
}

/** Cria a Pesquisa de Preços da consolidação a partir do PDF enviado —
 * idempotente: se já existir, só devolve o id existente (sem reler o PDF).
 * O texto extraído do PDF é guardado apenas como referência/auditoria; os
 * itens são pré-carregados a partir da própria ConsolidacaoTecnica, com o
 * valor pesquisado zerado para o servidor preencher e confirmar. */
export async function iniciarPesquisaPrecosAction(
  consolidacaoTecnicaId: string,
  formData: FormData,
): Promise<ResultadoIniciarPesquisaPrecos> {
  await exigirPesquisaPrecos();

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({ where: { id: consolidacaoTecnicaId } });
  if (!consolidacao) return { erro: "Consolidação não encontrada." };

  const existente = await prisma.pesquisaDePrecos.findUnique({ where: { consolidacaoTecnicaId } });
  if (existente) return { pesquisaDePrecosId: existente.id };

  const arquivo = formData.get("arquivo");
  if (!(arquivo instanceof File)) return { erro: "Selecione o PDF da pesquisa de preços." };

  let textoExtraido: string;
  try {
    textoExtraido = await extrairTextoPdf(arquivo);
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Não foi possível ler o PDF enviado." };
  }

  const metodologia = String(formData.get("metodologia") ?? "").trim();

  const [itensDfd, itensTecnicos] = await Promise.all([
    prisma.itemDfd.findMany({ where: { consolidacaoTecnicaId } }),
    prisma.itemTecnico.findMany({ where: { consolidacaoTecnicaId } }),
  ]);
  const itens = [
    ...itensDfd.map((it) => ({
      item: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
      quantidade: Number(it.quantidade),
    })),
    ...itensTecnicos.map((it) => ({ item: it.item, quantidade: Number(it.quantidade) })),
  ];
  if (itens.length === 0) return { erro: "Esta consolidação não tem itens para pesquisar preços." };

  const pesquisa = await prisma.pesquisaDePrecos.create({
    data: {
      consolidacaoTecnicaId,
      metodologia,
      arquivoPdfNome: arquivo.name,
      arquivoPdfTexto: textoExtraido,
      itens: {
        create: itens.map((it, ordem) => ({
          ordem,
          item: it.item,
          quantidade: it.quantidade,
          fontesConsultadas: "",
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

interface ItemEditavel {
  valorUnitarioPesquisado: number;
  medianaPesquisada: number | null;
  fontesConsultadas: string;
}

/** Faz o parse defensivo dos valores editáveis enviados pelo formulário —
 * item e quantidade nunca vêm do cliente, são sempre os já gravados no
 * banco (a lista de itens é a da própria ConsolidacaoTecnica). */
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

/** Valida todos os itens, a metodologia e o responsável, e finaliza a
 * Pesquisa de Preços (bloqueia edição futura). */
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

  await prisma.pesquisaDePrecos.update({
    where: { id: pesquisaDePrecosId },
    data: { metodologia, responsavelNome, responsavelMatricula, status: "FINALIZADO", finalizadoEm: new Date() },
  });

  await avancarStatusLicitacaoSeNecessario(
    resultado.pesquisa.consolidacaoTecnicaId,
    "PESQUISA_PRECOS",
    responsavelNome,
  );

  revalidatePath(`/pesquisa-precos/${resultado.pesquisa.consolidacaoTecnicaId}`);
  revalidatePath(`/licitacoes/${resultado.pesquisa.consolidacaoTecnicaId}`);
  return {};
}

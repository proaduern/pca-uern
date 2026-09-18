import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { PesquisaPrecosParaPdf } from "./pesquisa-precos-dados";

export type ResultadoCarregarPesquisaPrecosPdf =
  | { erro: string; status: 401 | 403 | 404 }
  | { pesquisa: PesquisaPrecosParaPdf };

/** Carrega e autoriza os dados de uma Pesquisa de Preços para geração de PDF
 * — Admin ou qualquer login do subsetor de Pesquisa de Preços (mesma
 * visibilidade irrestrita de Licitações, já que o subsetor atua sobre
 * consolidações de todos os setores técnicos). */
export async function carregarPesquisaPrecosParaPdf(
  consolidacaoTecnicaId: string,
): Promise<ResultadoCarregarPesquisaPrecosPdf> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };
  if (sessao.tipo !== "ADMIN" && sessao.tipo !== "PESQUISA_PRECOS") {
    return { erro: "Acesso negado.", status: 403 };
  }

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoTecnicaId },
    include: {
      categoria: true,
      pesquisaDePrecos: { include: { itens: { orderBy: { ordem: "asc" } } } },
    },
  });
  if (!consolidacao) return { erro: "Consolidação não encontrada.", status: 404 };
  if (!consolidacao.pesquisaDePrecos) {
    return { erro: "A Pesquisa de Preços ainda não foi iniciada.", status: 404 };
  }

  const pesquisa = consolidacao.pesquisaDePrecos;

  return {
    pesquisa: {
      processoSEI: consolidacao.processoSEI,
      categoriaNome: consolidacao.categoria.nome,
      metodologia: pesquisa.metodologia,
      arquivoPdfNome: pesquisa.arquivoPdfNome,
      status: pesquisa.status,
      responsavelNome: pesquisa.responsavelNome,
      responsavelMatricula: pesquisa.responsavelMatricula,
      finalizadoEm: pesquisa.finalizadoEm,
      itens: pesquisa.itens.map((it) => ({
        item: it.item,
        quantidade: Number(it.quantidade),
        valorUnitarioPesquisado: Number(it.valorUnitarioPesquisado),
        medianaPesquisada: it.medianaPesquisada === null ? null : Number(it.medianaPesquisada),
      })),
    },
  };
}

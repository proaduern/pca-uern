import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { TermoReferenciaParaPdf } from "./termo-referencia-dados";

export type ResultadoCarregarTermoReferenciaPdf =
  | { erro: string; status: 401 | 403 | 404 }
  | { tr: TermoReferenciaParaPdf };

/** Carrega e autoriza os dados de um Termo de Referência para geração de
 * PDF — Admin ou qualquer login do subsetor Planejamento (mesma
 * visibilidade irrestrita de Licitações/Pesquisa de Preços). */
export async function carregarTermoReferenciaParaPdf(
  consolidacaoTecnicaId: string,
): Promise<ResultadoCarregarTermoReferenciaPdf> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };
  if (sessao.tipo !== "ADMIN" && sessao.tipo !== "PLANEJAMENTO") {
    return { erro: "Acesso negado.", status: 403 };
  }

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoTecnicaId },
    include: {
      categoria: true,
      itensDfd: true,
      itensTecnicos: true,
      estudoTecnicoPreliminar: true,
      pesquisaDePrecos: { include: { itens: { orderBy: { ordem: "asc" } } } },
      termoReferencia: true,
    },
  });
  if (!consolidacao) return { erro: "Consolidação não encontrada.", status: 404 };
  if (!consolidacao.termoReferencia) {
    return { erro: "O Termo de Referência ainda não foi iniciado.", status: 404 };
  }
  // Só existe TermoReferencia depois de ETP e Pesquisa finalizados (ver
  // criarTermoReferenciaAction), então os dois sempre existem aqui.
  const etp = consolidacao.estudoTecnicoPreliminar!;
  const pesquisa = consolidacao.pesquisaDePrecos!;
  const tr = consolidacao.termoReferencia;

  return {
    tr: {
      processoSEI: consolidacao.processoSEI,
      categoriaNome: consolidacao.categoria.nome,

      objeto: etp.objeto,
      necessidadeContratacao: etp.necessidadeContratacao,
      referenciaPca: etp.referenciaPca,
      descricaoSolucaoCompleta: etp.descricaoSolucaoCompleta,

      metodologiaPesquisa: pesquisa.metodologia,
      itensPesquisa: pesquisa.itens.map((it) => ({
        item: it.item,
        quantidade: Number(it.quantidade),
        valorUnitarioPesquisado: Number(it.valorUnitarioPesquisado),
      })),

      requisitosContratacao: tr.requisitosContratacao,
      modeloExecucaoObjeto: tr.modeloExecucaoObjeto,
      modeloGestaoContrato: tr.modeloGestaoContrato,
      criteriosMedicaoPagamento: tr.criteriosMedicaoPagamento,
      formaSelecaoFornecedor: tr.formaSelecaoFornecedor,
      exigenciasHabilitacao: tr.exigenciasHabilitacao,
      adequacaoOrcamentaria: tr.adequacaoOrcamentaria,
      garantiaExecucao: tr.garantiaExecucao,

      status: tr.status,
      responsavelNome: tr.responsavelNome,
      responsavelMatricula: tr.responsavelMatricula,
      finalizadoEm: tr.finalizadoEm,

      itens: [
        ...consolidacao.itensDfd.map((it) => ({
          nome: it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)",
          quantidade: it.quantidade != null ? Number(it.quantidade) : null,
          valorUnit: it.valorUnit != null ? Number(it.valorUnit) : null,
          valorTotal: Number(it.valorTotal),
        })),
        ...consolidacao.itensTecnicos.map((it) => ({
          nome: it.item,
          quantidade: Number(it.quantidade),
          valorUnit: Number(it.valorUnit),
          valorTotal: Number(it.valorTotal),
        })),
      ],
    },
  };
}

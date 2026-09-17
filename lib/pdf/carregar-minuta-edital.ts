import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { MinutaEditalParaPdf } from "./minuta-edital-dados";

export type ResultadoCarregarMinutaEditalPdf =
  | { erro: string; status: 401 | 403 | 404 }
  | { minuta: MinutaEditalParaPdf };

/** Carrega e autoriza os dados de uma Minuta de Edital para geração de PDF
 * — Admin ou qualquer login do subsetor Agente de Contratação (mesma
 * visibilidade irrestrita de Licitações/Pesquisa de Preços/Planejamento). */
export async function carregarMinutaEditalParaPdf(
  consolidacaoTecnicaId: string,
): Promise<ResultadoCarregarMinutaEditalPdf> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };
  if (sessao.tipo !== "ADMIN" && sessao.tipo !== "AGENTE_CONTRATACAO") {
    return { erro: "Acesso negado.", status: 403 };
  }

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoTecnicaId },
    include: {
      categoria: true,
      itensDfd: true,
      itensTecnicos: true,
      estudoTecnicoPreliminar: true,
      termoReferencia: true,
      minutaEdital: true,
    },
  });
  if (!consolidacao) return { erro: "Consolidação não encontrada.", status: 404 };
  if (!consolidacao.minutaEdital) {
    return { erro: "A Minuta de Edital ainda não foi iniciada.", status: 404 };
  }
  // Só existe MinutaEdital depois do TR finalizado (que por sua vez só
  // existe com o ETP finalizado — ver criarMinutaEditalAction), então os
  // dois sempre existem aqui.
  const etp = consolidacao.estudoTecnicoPreliminar!;
  const tr = consolidacao.termoReferencia!;
  const minuta = consolidacao.minutaEdital;

  return {
    minuta: {
      processoSEI: consolidacao.processoSEI,
      categoriaNome: consolidacao.categoria.nome,

      objeto: etp.objeto,

      formaSelecaoFornecedor: tr.formaSelecaoFornecedor,
      exigenciasHabilitacao: tr.exigenciasHabilitacao,
      criteriosMedicaoPagamento: tr.criteriosMedicaoPagamento,
      garantiaExecucao: tr.garantiaExecucao,

      condicoesParticipacao: minuta.condicoesParticipacao,
      credenciamento: minuta.credenciamento,
      apresentacaoProposta: minuta.apresentacaoProposta,
      julgamentoPropostas: minuta.julgamentoPropostas,
      documentosHabilitacao: minuta.documentosHabilitacao,
      recursosAdministrativos: minuta.recursosAdministrativos,
      sancoesAdministrativas: minuta.sancoesAdministrativas,
      disposicoesGerais: minuta.disposicoesGerais,

      status: minuta.status,
      responsavelNome: minuta.responsavelNome,
      responsavelMatricula: minuta.responsavelMatricula,
      finalizadoEm: minuta.finalizadoEm,

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

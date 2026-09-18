import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { AnaliseRiscosParaPdf } from "./riscos-dados";

export type ResultadoCarregarRiscosPdf = { erro: string; status: 401 | 403 | 404 } | { riscos: AnaliseRiscosParaPdf };

/** Carrega e autoriza os dados de uma Análise de Riscos para geração de PDF — Setor
 * Técnico dono da consolidação ou Admin (PROAD). */
export async function carregarRiscosParaPdf(consolidacaoTecnicaId: string): Promise<ResultadoCarregarRiscosPdf> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoTecnicaId },
    include: {
      categoria: true,
      analiseRiscos: { include: { itens: { orderBy: { ordem: "asc" } } } },
    },
  });
  if (!consolidacao) return { erro: "Consolidação não encontrada.", status: 404 };
  if (sessao.tipo !== "ADMIN" && !(sessao.tipo === "SETOR_TECNICO" && consolidacao.setorTecnicoId === sessao.id)) {
    return { erro: "Acesso negado.", status: 403 };
  }
  if (!consolidacao.analiseRiscos) {
    return { erro: "A Análise de Riscos ainda não foi iniciada.", status: 404 };
  }

  const riscos = consolidacao.analiseRiscos;

  return {
    riscos: {
      processoSEI: consolidacao.processoSEI,
      categoriaNome: consolidacao.categoria.nome,
      status: riscos.status,
      responsavelNome: riscos.responsavelNome,
      responsavelMatricula: riscos.responsavelMatricula,
      finalizadoEm: riscos.finalizadoEm,
      itens: riscos.itens.map((it) => ({
        fase: it.fase,
        descricao: it.descricao,
        danos: it.danos,
        probabilidade: it.probabilidade,
        impacto: it.impacto,
        nivelAceitacao: it.nivelAceitacao,
        acoesPreventivas: it.acoesPreventivas,
        acoesContingenciais: it.acoesContingenciais,
        responsavel: it.responsavel,
      })),
    },
  };
}

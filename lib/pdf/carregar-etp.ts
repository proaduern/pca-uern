import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { EtpParaPdf } from "./etp-dados";

export type ResultadoCarregarEtpPdf = { erro: string; status: 401 | 403 | 404 } | { etp: EtpParaPdf };

/** Carrega e autoriza os dados de um ETP para geração de PDF — Setor Técnico
 * dono da consolidação ou Admin (PROAD). */
export async function carregarEtpParaPdf(consolidacaoTecnicaId: string): Promise<ResultadoCarregarEtpPdf> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado.", status: 401 };

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoTecnicaId },
    include: {
      categoria: true,
      itensDfd: true,
      itensTecnicos: true,
      estudoTecnicoPreliminar: true,
    },
  });
  if (!consolidacao) return { erro: "Consolidação não encontrada.", status: 404 };
  if (sessao.tipo !== "ADMIN" && !(sessao.tipo === "SETOR_TECNICO" && consolidacao.setorTecnicoId === sessao.id)) {
    return { erro: "Acesso negado.", status: 403 };
  }
  if (!consolidacao.estudoTecnicoPreliminar) {
    return { erro: "O Estudo Técnico Preliminar ainda não foi iniciado.", status: 404 };
  }

  const etp = consolidacao.estudoTecnicoPreliminar;

  return {
    etp: {
      processoSEI: consolidacao.processoSEI,
      categoriaNome: consolidacao.categoria.nome,
      objeto: etp.objeto,
      localEntregaPrestacao: etp.localEntregaPrestacao,
      necessidadeContratacao: etp.necessidadeContratacao,
      referenciaPca: etp.referenciaPca,
      requisitosContratacao: etp.requisitosContratacao,
      estimativaQuantidadesMemoria: etp.estimativaQuantidadesMemoria,
      levantamentoMercadoJustificativa: etp.levantamentoMercadoJustificativa,
      estimativaPreliminarPrecos: etp.estimativaPreliminarPrecos,
      descricaoSolucaoCompleta: etp.descricaoSolucaoCompleta,
      justificativaParcelamento: etp.justificativaParcelamento,
      resultadosEsperados: etp.resultadosEsperados,
      providenciasAdministracao: etp.providenciasAdministracao,
      contratacoesCorrelatas: etp.contratacoesCorrelatas,
      impactosAmbientais: etp.impactosAmbientais,
      declaracaoViabilidade: etp.declaracaoViabilidade,
      status: etp.status,
      responsavelNome: etp.responsavelNome,
      responsavelMatricula: etp.responsavelMatricula,
      finalizadoEm: etp.finalizadoEm,
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

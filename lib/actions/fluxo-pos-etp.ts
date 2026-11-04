"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { ResultadoAcao } from "./tipos";

async function exigirAgenteOuGestorProcesso(consolidacaoId: string) {
  const sessao = await obterSessao();
  if (!sessao) throw new Error("Não autenticado.");

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      estudoTecnicoPreliminar: true,
      pesquisaDePrecos: true,
      termoReferencia: true,
    },
  });
  if (!consolidacao) throw new Error("Processo consolidado não encontrado.");

  if (
    sessao.tipo !== "ADMIN" &&
    sessao.tipo !== "LICITACOES" &&
    !(sessao.tipo === "AGENTE_CONTRATACAO" && consolidacao.agenteContratacaoDesignadoId === sessao.id)
  ) {
    throw new Error("Acesso restrito ao Agente de Contratação designado para este processo.");
  }

  return { sessao, consolidacao };
}

/**
 * Agente de Contratação realiza diligência ao Setor Técnico durante a Análise Preliminar
 * para corrigir inconsistências no ETP e/ou na Lista de Itens.
 */
export async function diligenciarAoSetorTecnicoAction(
  consolidacaoId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  try {
    const { consolidacao } = await exigirAgenteOuGestorProcesso(consolidacaoId);

    const alvo = String(formData.get("alvo") ?? "AMBOS").trim().toUpperCase();
    const motivo = String(formData.get("motivo") ?? "").trim();

    if (!["ETP", "ITENS", "AMBOS"].includes(alvo)) {
      return { erro: "Selecione o alvo da diligência (ETP, Lista de Itens ou Ambos)." };
    }
    if (!motivo) {
      return { erro: "Descreva a inconsistência ou orientação para o Setor Técnico corrigir." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.consolidacaoTecnica.update({
        where: { id: consolidacaoId },
        data: {
          etapaFluxoPosEtp: "DILIGENCIA_SETOR_TECNICO",
          analisePreliminarStatus: "DILIGENCIA",
          diligenciaAgenteAlvo: alvo,
          diligenciaAgenteMotivo: motivo,
          diligenciaAgenteEm: new Date(),
          diligenciaAgenteAtendidaEm: null,
        },
      });

      if ((alvo === "ETP" || alvo === "AMBOS") && consolidacao.estudoTecnicoPreliminar) {
        await tx.estudoTecnicoPreliminar.update({
          where: { id: consolidacao.estudoTecnicoPreliminar.id },
          data: {
            status: "RASCUNHO",
            finalizadoEm: null,
          },
        });
      }
    });

    revalidatePath(`/agente-contratacao/${consolidacaoId}`);
    revalidatePath(`/licitacoes/${consolidacaoId}`);
    revalidatePath(`/consolidacao/${consolidacao.categoriaId}`);
    revalidatePath(`/consolidacao/${consolidacao.categoriaId}/etp/${consolidacaoId}`);
    revalidatePath("/");
    return {};
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao registrar diligência ao Setor Técnico." };
  }
}

/**
 * Setor Técnico conclui o atendimento da diligência do Agente de Contratação e devolve o processo
 * para a Análise Preliminar do Agente.
 */
export async function concluirDiligenciaSetorTecnicoAction(
  consolidacaoId: string,
): Promise<ResultadoAcao> {
  try {
    const sessao = await obterSessao();
    if (!sessao) return { erro: "Não autenticado." };

    const consolidacao = await prisma.consolidacaoTecnica.findUnique({
      where: { id: consolidacaoId },
      include: { estudoTecnicoPreliminar: true },
    });
    if (!consolidacao) return { erro: "Consolidação não encontrada." };

    if (
      sessao.tipo !== "ADMIN" &&
      !(sessao.tipo === "SETOR_TECNICO" && consolidacao.setorTecnicoId === sessao.id)
    ) {
      return { erro: "Apenas o Setor Técnico responsável pode concluir esta diligência." };
    }

    if (consolidacao.estudoTecnicoPreliminar?.status !== "FINALIZADO") {
      return { erro: "Finalize o Estudo Técnico Preliminar (ETP) antes de reenviar ao Agente de Contratação." };
    }

    await prisma.consolidacaoTecnica.update({
      where: { id: consolidacaoId },
      data: {
        etapaFluxoPosEtp: "ANALISE_PRELIMINAR_AGENTE",
        analisePreliminarStatus: "PENDENTE",
        diligenciaAgenteAtendidaEm: new Date(),
      },
    });

    revalidatePath(`/consolidacao/${consolidacao.categoriaId}`);
    revalidatePath(`/consolidacao/${consolidacao.categoriaId}/etp/${consolidacaoId}`);
    revalidatePath(`/agente-contratacao/${consolidacaoId}`);
    revalidatePath(`/licitacoes/${consolidacaoId}`);
    revalidatePath("/");
    return {};
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao reenviar processo ao Agente de Contratação." };
  }
}

/**
 * Agente de Contratação aprova a Análise Preliminar e encaminha o processo para a Pesquisa de Preços.
 * Também garante que o registro de PesquisaDePrecos já esteja inicializado com os itens consolidados
 * para que o Setor de Pesquisa de Preços possa exportar imediatamente a planilha do Banco de Preços.
 */
export async function aprovarAnalisePreliminarAgenteAction(
  consolidacaoId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  try {
    const { consolidacao } = await exigirAgenteOuGestorProcesso(consolidacaoId);

    if (consolidacao.estudoTecnicoPreliminar?.status !== "FINALIZADO") {
      return { erro: "O ETP precisa estar finalizado pelo Setor Técnico para aprovar a análise preliminar." };
    }

    const observacao = String(formData.get("observacao") ?? "").trim() || null;

    await prisma.consolidacaoTecnica.update({
      where: { id: consolidacaoId },
      data: {
        etapaFluxoPosEtp: "EM_PESQUISA_PRECOS",
        analisePreliminarStatus: "APROVADO",
        analisePreliminarEm: new Date(),
        analisePreliminarObservacao: observacao,
      },
    });

    // Se a PesquisaDePrecos ainda não foi criada, inicializa automaticamente com os itens consolidados
    if (!consolidacao.pesquisaDePrecos) {
      const [itensDfd, itensTecnicos] = await Promise.all([
        prisma.itemDfd.findMany({ where: { consolidacaoTecnicaId: consolidacaoId } }),
        prisma.itemTecnico.findMany({ where: { consolidacaoTecnicaId: consolidacaoId } }),
      ]);

      const agrupados = new Map<string, number>();
      for (const it of itensDfd) {
        const nome = (it.itemCatalogoNome ?? it.itemNomeLivre ?? "(sem nome)").trim();
        agrupados.set(nome, (agrupados.get(nome) ?? 0) + Number(it.quantidade ?? 1));
      }
      for (const it of itensTecnicos) {
        const nome = it.item.trim();
        agrupados.set(nome, (agrupados.get(nome) ?? 0) + Number(it.quantidade ?? 1));
      }

      if (agrupados.size > 0) {
        await prisma.pesquisaDePrecos.create({
          data: {
            consolidacaoTecnicaId: consolidacaoId,
            metodologia:
              "Pesquisa de preços realizada em conformidade com o art. 23 da Lei nº 14.133/2021 e IN SEGES/ME nº 65/2021, utilizando o Sistema Banco de Preços.",
            itens: {
              create: [...agrupados.entries()].map(([item, quantidade], ordem) => ({
                ordem,
                item,
                quantidade,
                fontesConsultadas: "Banco de Preços",
              })),
            },
          },
        });
      }
    }

    revalidatePath(`/agente-contratacao/${consolidacaoId}`);
    revalidatePath(`/pesquisa-precos/${consolidacaoId}`);
    revalidatePath(`/licitacoes/${consolidacaoId}`);
    revalidatePath("/");
    return {};
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao aprovar análise preliminar." };
  }
}

/**
 * Agente de Contratação registra no sistema que solicitou (fora do sistema) à Contabilidade
 * as informações de Dotação Orçamentária, após o retorno da Pesquisa de Preços.
 */
export async function registrarSolicitacaoDotacaoContabilidadeAction(
  consolidacaoId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  try {
    const { consolidacao } = await exigirAgenteOuGestorProcesso(consolidacaoId);

    if (consolidacao.pesquisaDePrecos?.status !== "FINALIZADO") {
      return { erro: "A Pesquisa de Preços precisa estar concluída antes de solicitar a dotação orçamentária." };
    }

    const observacao =
      String(formData.get("observacao") ?? "").trim() ||
      "Solicitação de informações de dotação orçamentária encaminhada à Contabilidade.";

    await prisma.consolidacaoTecnica.update({
      where: { id: consolidacaoId },
      data: {
        etapaFluxoPosEtp: "DOTACAO_SOLICITADA_CONTABILIDADE",
        dotacaoSolicitadaContabilidadeEm: new Date(),
        dotacaoSolicitadaObservacao: observacao,
      },
    });

    revalidatePath(`/agente-contratacao/${consolidacaoId}`);
    revalidatePath(`/licitacoes/${consolidacaoId}`);
    revalidatePath("/");
    return {};
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao registrar solicitação de dotação à Contabilidade." };
  }
}

/**
 * Após receber a Dotação Orçamentária da Contabilidade, o Agente de Contratação registra a dotação
 * e encaminha o processo no sistema para o Servidor do Setor de Planejamento elaborar o Termo de Referência (TR).
 */
export async function registrarRecebimentoDotacaoEEncaminharTrAction(
  consolidacaoId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  try {
    const { consolidacao } = await exigirAgenteOuGestorProcesso(consolidacaoId);

    if (consolidacao.pesquisaDePrecos?.status !== "FINALIZADO") {
      return { erro: "A Pesquisa de Preços precisa estar concluída antes de encaminhar ao Planejamento (TR)." };
    }

    const dotacaoOrcamentariaTexto = String(formData.get("dotacaoOrcamentariaTexto") ?? "").trim();
    const planejamentoDesignadoId = String(formData.get("planejamentoDesignadoId") ?? "").trim() || null;

    if (!dotacaoOrcamentariaTexto) {
      return { erro: "Informe os dados da Dotação Orçamentária recebida da Contabilidade." };
    }
    if (!planejamentoDesignadoId) {
      return { erro: "Selecione o servidor do Setor de Planejamento responsável por elaborar o TR." };
    }

    const servidorPlan = await prisma.planejamento.findUnique({ where: { id: planejamentoDesignadoId } });
    if (!servidorPlan || !servidorPlan.ativo) {
      return { erro: "Servidor de Planejamento inválido ou inativo." };
    }

    await prisma.$transaction(async (tx) => {
      await tx.consolidacaoTecnica.update({
        where: { id: consolidacaoId },
        data: {
          etapaFluxoPosEtp: "ENCAMINHADO_PLANEJAMENTO_TR",
          dotacaoSolicitadaContabilidadeEm:
            consolidacao.dotacaoSolicitadaContabilidadeEm ?? new Date(),
          dotacaoRecebidaEm: new Date(),
          dotacaoOrcamentariaTexto,
          planejamentoDesignadoId,
          encaminhadoPlanejamentoEm: new Date(),
        },
      });

      // Já cria ou atualiza o rascunho do Termo de Referência pré-preenchendo a Adequação Orçamentária
      if (!consolidacao.termoReferencia) {
        await tx.termoReferencia.create({
          data: {
            consolidacaoTecnicaId: consolidacaoId,
            requisitosContratacao: "",
            modeloExecucaoObjeto: "",
            modeloGestaoContrato: "",
            criteriosMedicaoPagamento: "",
            formaSelecaoFornecedor: "",
            exigenciasHabilitacao: "",
            adequacaoOrcamentaria: dotacaoOrcamentariaTexto,
            garantiaExecucao: "",
            responsavelNome: servidorPlan.nome,
            responsavelMatricula: servidorPlan.matricula,
          },
        });
      } else if (
        consolidacao.termoReferencia.status === "RASCUNHO" &&
        !consolidacao.termoReferencia.adequacaoOrcamentaria.trim()
      ) {
        await tx.termoReferencia.update({
          where: { id: consolidacao.termoReferencia.id },
          data: {
            adequacaoOrcamentaria: dotacaoOrcamentariaTexto,
            responsavelNome: consolidacao.termoReferencia.responsavelNome || servidorPlan.nome,
            responsavelMatricula: consolidacao.termoReferencia.responsavelMatricula || servidorPlan.matricula,
          },
        });
      }
    });

    revalidatePath(`/agente-contratacao/${consolidacaoId}`);
    revalidatePath(`/planejamento/${consolidacaoId}`);
    revalidatePath(`/licitacoes/${consolidacaoId}`);
    revalidatePath("/");
    return {};
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao encaminhar processo para elaboração do TR." };
  }
}

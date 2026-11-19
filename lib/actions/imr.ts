"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import {
  IMR_PADRAO_DEDICACAO_EXCLUSIVA,
  IMR_PADRAO_SERVICOS_GERAIS,
  PACOTES_ESPECIALIZADOS_IMR,
} from "@/lib/imr-padrao";
import type { ResultadoAcao } from "./tipos";

export async function obterOuCriarImrAction(
  consolidacaoId: string,
  tipoImr: "SERVICOS_GERAIS" | "DEDICACAO_EXCLUSIVA" = "SERVICOS_GERAIS",
) {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado." };

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      categoria: true,
      estudoTecnicoPreliminar: true,
      instrumentoMedicaoResultado: {
        include: { itens: { orderBy: { ordem: "asc" } } },
      },
    },
  });

  if (!consolidacao) return { erro: "Consolidação não encontrada." };

  if (consolidacao.instrumentoMedicaoResultado) {
    return { imr: consolidacao.instrumentoMedicaoResultado };
  }

  // Define itens padrão com base no tipo escolhido
  const itensPadrao =
    tipoImr === "DEDICACAO_EXCLUSIVA"
      ? IMR_PADRAO_DEDICACAO_EXCLUSIVA
      : IMR_PADRAO_SERVICOS_GERAIS;

  const objeto =
    consolidacao.estudoTecnicoPreliminar?.objeto ||
    `Prestação de serviços referente à categoria ${consolidacao.categoria.nome}`;

  const novoImr = await prisma.instrumentoMedicaoResultado.create({
    data: {
      consolidacaoTecnicaId: consolidacaoId,
      tipoImr,
      objetoContratual: objeto,
      status: "RASCUNHO",
      itens: {
        create: itensPadrao.map((it, idx) => ({
          ordem: idx,
          indicadorNumero: it.indicadorNumero,
          indicadorNome: it.indicadorNome,
          servicoEscopo: it.servicoEscopo,
          descricao: it.descricao,
          pontuacaoPrevista: it.pontuacaoPrevista,
          pontuacaoTexto: it.pontuacaoTexto,
        })),
      },
    },
    include: { itens: { orderBy: { ordem: "asc" } } },
  });

  revalidatePath(`/consolidacao/${consolidacao.categoriaId}/imr/${consolidacaoId}`);
  return { imr: novoImr };
}

export async function salvarImrRascunhoAction(
  imrId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado." };

  try {
    const objetoContratual = String(formData.get("objetoContratual") ?? "").trim();
    const observacoes = String(formData.get("observacoes") ?? "").trim();
    const responsavelNome = String(formData.get("responsavelNome") ?? "").trim() || sessao.nome;
    const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim() || null;
    const itensJson = String(formData.get("itensJson") ?? "[]");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itens: any[] = JSON.parse(itensJson);

    await prisma.$transaction(async (tx) => {
      await tx.instrumentoMedicaoResultado.update({
        where: { id: imrId },
        data: {
          objetoContratual,
          observacoes,
          responsavelNome,
          responsavelMatricula,
        },
      });

      // Recria os itens
      await tx.imrItem.deleteMany({ where: { imrId } });

      let ordem = 0;
      for (const it of itens) {
        await tx.imrItem.create({
          data: {
            imrId,
            ordem: ordem++,
            indicadorNumero: String(it.indicadorNumero || "Indicador").trim(),
            indicadorNome: String(it.indicadorNome || "Serviços").trim(),
            servicoEscopo: String(it.servicoEscopo || "GERAL").trim(),
            descricao: String(it.descricao || "").trim(),
            pontuacaoPrevista: Number(it.pontuacaoPrevista) || 0.5,
            pontuacaoTexto: it.pontuacaoTexto || `${Number(it.pontuacaoPrevista || 0.5)} ponto(s)`,
            aplicadaSimNao: it.aplicadaSimNao === true ? true : it.aplicadaSimNao === false ? false : null,
            pontuacaoAplicada: it.pontuacaoAplicada != null ? Number(it.pontuacaoAplicada) : null,
            documentoSei: it.documentoSei ? String(it.documentoSei).trim() : null,
          },
        });
      }
    });

    return {};
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao salvar IMR." };
  }
}

export async function finalizarImrAction(
  imrId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado." };

  try {
    const res = await salvarImrRascunhoAction(imrId, formData);
    if (res.erro) return res;

    await prisma.instrumentoMedicaoResultado.update({
      where: { id: imrId },
      data: {
        status: "FINALIZADO",
        finalizadoEm: new Date(),
      },
    });

    return {};
  } catch (e) {
    return { erro: e instanceof Error ? e.message : "Erro ao finalizar IMR." };
  }
}

export async function adicionarPacoteEspecializadoAction(
  imrId: string,
  pacoteKey: string,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (!sessao) return { erro: "Não autenticado." };

  const pacote = PACOTES_ESPECIALIZADOS_IMR[pacoteKey];
  if (!pacote) return { erro: "Pacote especializado não encontrado." };

  const maxOrdem = await prisma.imrItem.aggregate({
    where: { imrId },
    _max: { ordem: true },
  });
  let ordem = (maxOrdem._max.ordem ?? 0) + 1;

  for (const it of pacote.itens) {
    await prisma.imrItem.create({
      data: {
        imrId,
        ordem: ordem++,
        indicadorNumero: it.indicadorNumero,
        indicadorNome: it.indicadorNome,
        servicoEscopo: it.servicoEscopo,
        descricao: it.descricao,
        pontuacaoPrevista: it.pontuacaoPrevista,
        pontuacaoTexto: it.pontuacaoTexto,
      },
    });
  }

  return {};
}

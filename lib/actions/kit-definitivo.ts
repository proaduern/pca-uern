"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { obterSessao } from "@/lib/auth";
import type { ResultadoAcao } from "./tipos";
import { reservarProximoSequencialPca } from "@/lib/sequencial-documento-pca";

export async function aprovarKitDefinitivoPosPgeAction(
  consolidacaoId: string,
  parecerSei: string,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (
    !sessao ||
    (sessao.tipo !== "AGENTE_CONTRATACAO" &&
      sessao.tipo !== "ADMIN" &&
      sessao.tipo !== "LICITACOES")
  ) {
    return { sucesso: false, erro: "Apenas o Agente de Contratação ou Licitações pode aprovar o Kit Definitivo." };
  }

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      estudoTecnicoPreliminar: true,
      termoReferencia: true,
      minutaEdital: true,
      analiseRiscos: true,
      instrumentoMedicaoResultado: true,
    },
  });

  if (!consolidacao) {
    return { sucesso: false, erro: "Consolidação técnica não encontrada." };
  }

  if (consolidacao.termoReferencia?.status !== "FINALIZADO") {
    return { sucesso: false, erro: "O Termo de Referência deve estar finalizado antes da aprovação do Kit." };
  }

  const anoAtual = new Date().getFullYear();

  // Reserva sequencial atômico para cada artefato que ainda não tiver número fixado
  const editalSeq =
    consolidacao.editalNumeroFormatado ||
    (await reservarProximoSequencialPca("EDITAL", anoAtual)).tituloCompleto;

  const trSeq =
    consolidacao.trNumeroFormatado ||
    (await reservarProximoSequencialPca("TERMO_REFERENCIA", anoAtual)).tituloCompleto;

  const etpSeq =
    consolidacao.etpNumeroFormatado ||
    (await reservarProximoSequencialPca("ETP", anoAtual)).tituloCompleto;

  const riscosSeq =
    consolidacao.riscosNumeroFormatado ||
    (await reservarProximoSequencialPca("MAPA_RISCOS", anoAtual)).tituloCompleto;

  const imrSeq =
    consolidacao.imrNumeroFormatado ||
    (await reservarProximoSequencialPca("IMR", anoAtual)).tituloCompleto;

  const contratoSeq =
    consolidacao.contratoNumeroFormatado ||
    (await reservarProximoSequencialPca("MINUTA_CONTRATO", anoAtual)).tituloCompleto;

  const ataSeq =
    consolidacao.ataNumeroFormatado ||
    (await reservarProximoSequencialPca("MINUTA_ATA", anoAtual)).tituloCompleto;

  await prisma.consolidacaoTecnica.update({
    where: { id: consolidacaoId },
    data: {
      kitDefinitivoAprovadoEm: new Date(),
      kitDefinitivoParecerSei: parecerSei.trim(),
      kitDefinitivoAgenteNome: sessao.nome,
      editalNumeroFormatado: editalSeq,
      trNumeroFormatado: trSeq,
      etpNumeroFormatado: etpSeq,
      riscosNumeroFormatado: riscosSeq,
      imrNumeroFormatado: imrSeq,
      contratoNumeroFormatado: contratoSeq,
      ataNumeroFormatado: ataSeq,
    },
  });

  revalidatePath(`/agente-contratacao/${consolidacaoId}`);
  revalidatePath(`/planejamento/${consolidacaoId}`);
  revalidatePath(`/consolidacao/${consolidacao.categoriaId}`);

  return { sucesso: true };
}

export async function solicitarDiligenciaPosPgeAction(
  consolidacaoId: string,
  artefatoAlvo: "ETP" | "PESQUISA" | "TR" | "RISCOS" | "IMR" | "EDITAL",
  motivo: string,
): Promise<ResultadoAcao> {
  const sessao = await obterSessao();
  if (
    !sessao ||
    (sessao.tipo !== "AGENTE_CONTRATACAO" &&
      sessao.tipo !== "ADMIN" &&
      sessao.tipo !== "LICITACOES")
  ) {
    return { sucesso: false, erro: "Apenas o Agente de Contratação ou Licitações pode abrir diligência pós-PGE." };
  }

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoId },
    include: {
      estudoTecnicoPreliminar: true,
      termoReferencia: true,
      pesquisaDePrecos: true,
      analiseRiscos: true,
      instrumentoMedicaoResultado: true,
      minutaEdital: true,
    },
  });

  if (!consolidacao) {
    return { sucesso: false, erro: "Consolidação técnica não encontrada." };
  }

  // Reabre seletivamente o artefato apontado
  switch (artefatoAlvo) {
    case "ETP":
      if (consolidacao.estudoTecnicoPreliminar) {
        await prisma.estudoTecnicoPreliminar.update({
          where: { id: consolidacao.estudoTecnicoPreliminar.id },
          data: { status: "RASCUNHO" },
        });
      }
      break;
    case "TR":
      if (consolidacao.termoReferencia) {
        await prisma.termoReferencia.update({
          where: { id: consolidacao.termoReferencia.id },
          data: { status: "RASCUNHO" },
        });
      }
      break;
    case "PESQUISA":
      if (consolidacao.pesquisaDePrecos) {
        await prisma.pesquisaDePrecos.update({
          where: { id: consolidacao.pesquisaDePrecos.id },
          data: { status: "RASCUNHO" },
        });
      }
      break;
    case "RISCOS":
      if (consolidacao.analiseRiscos) {
        await prisma.analiseRiscos.update({
          where: { id: consolidacao.analiseRiscos.id },
          data: { status: "RASCUNHO" },
        });
      }
      break;
    case "IMR":
      if (consolidacao.instrumentoMedicaoResultado) {
        await prisma.instrumentoMedicaoResultado.update({
          where: { id: consolidacao.instrumentoMedicaoResultado.id },
          data: { status: "RASCUNHO" },
        });
      }
      break;
    case "EDITAL":
      if (consolidacao.minutaEdital) {
        await prisma.minutaEdital.update({
          where: { id: consolidacao.minutaEdital.id },
          data: { status: "RASCUNHO" },
        });
      }
      break;
  }

  // Registra diligência na consolidação
  await prisma.consolidacaoTecnica.update({
    where: { id: consolidacaoId },
    data: {
      diligenciaAgenteAlvo: artefatoAlvo as any,
      diligenciaAgenteMotivo: `[Diligência Pós-PGE] ${motivo.trim()}`,
      diligenciaAgenteEm: new Date(),
      diligenciaAgenteAtendidaEm: null,
      kitDefinitivoAprovadoEm: null, // reinicia aprovação do kit até conclusão do ajuste
    },
  });

  revalidatePath(`/agente-contratacao/${consolidacaoId}`);
  revalidatePath(`/planejamento/${consolidacaoId}`);
  revalidatePath(`/consolidacao/${consolidacao.categoriaId}`);

  return { sucesso: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirAgenteContratacao } from "@/lib/auth";
import { validarMinutaEditalParaFinalizar, type DadosMinutaEdital } from "@/lib/minuta-edital";
import { avancarStatusLicitacaoSeNecessario } from "./avancar-status";
import type { ResultadoAcao } from "./tipos";

function parseMinutaEditalFormData(formData: FormData): DadosMinutaEdital {
  const campo = (nome: string) => String(formData.get(nome) ?? "").trim();
  return {
    condicoesParticipacao: campo("condicoesParticipacao"),
    credenciamento: campo("credenciamento"),
    apresentacaoProposta: campo("apresentacaoProposta"),
    julgamentoPropostas: campo("julgamentoPropostas"),
    documentosHabilitacao: campo("documentosHabilitacao"),
    recursosAdministrativos: campo("recursosAdministrativos"),
    sancoesAdministrativas: campo("sancoesAdministrativas"),
    disposicoesGerais: campo("disposicoesGerais"),
  };
}

export interface ResultadoCriarMinutaEdital extends ResultadoAcao {
  minutaEditalId?: string;
}

/** Cria a Minuta de Edital da consolidação — idempotente: se já existir, só
 * devolve o id existente. Só pode ser iniciada com o Termo de Referência já
 * finalizado, já que a minuta se apoia no conteúdo dele (e, por tabela, do ETP). */
export async function criarMinutaEditalAction(consolidacaoTecnicaId: string): Promise<ResultadoCriarMinutaEdital> {
  await exigirAgenteContratacao();

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoTecnicaId },
    include: { termoReferencia: true },
  });
  if (!consolidacao) return { erro: "Consolidação não encontrada." };

  const existente = await prisma.minutaEdital.findUnique({ where: { consolidacaoTecnicaId } });
  if (existente) return { minutaEditalId: existente.id };

  if (consolidacao.termoReferencia?.status !== "FINALIZADO") {
    return { erro: "O Termo de Referência desta consolidação ainda não foi finalizado." };
  }

  const minuta = await prisma.minutaEdital.create({
    data: {
      consolidacaoTecnicaId,
      condicoesParticipacao: "",
      credenciamento: "",
      apresentacaoProposta: "",
      julgamentoPropostas: "",
      documentosHabilitacao: "",
      recursosAdministrativos: "",
      sancoesAdministrativas: "",
      disposicoesGerais: "",
    },
  });

  revalidatePath(`/agente-contratacao/${consolidacaoTecnicaId}`);
  return { minutaEditalId: minuta.id };
}

async function obterMinutaEditalEditavelOuErro(minutaEditalId: string) {
  const minuta = await prisma.minutaEdital.findUnique({
    where: { id: minutaEditalId },
    include: { consolidacaoTecnica: true },
  });
  if (!minuta) return { erro: "Minuta de Edital não encontrada." };
  if (minuta.status === "FINALIZADO") {
    return { erro: "Esta Minuta de Edital já foi finalizada e não pode mais ser editada." };
  }
  return { minuta };
}

/** Salva a minuta como rascunho — sem exigir todas as seções preenchidas. */
export async function salvarMinutaEditalRascunhoAction(
  minutaEditalId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  await exigirAgenteContratacao();
  const resultado = await obterMinutaEditalEditavelOuErro(minutaEditalId);
  if ("erro" in resultado) return { erro: resultado.erro };

  const dados = parseMinutaEditalFormData(formData);
  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim() || null;
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim() || null;

  await prisma.minutaEdital.update({
    where: { id: minutaEditalId },
    data: { ...dados, responsavelNome, responsavelMatricula },
  });

  revalidatePath(`/agente-contratacao/${resultado.minuta.consolidacaoTecnicaId}`);
  return {};
}

/** Valida todas as seções e o responsável, e finaliza a minuta (bloqueia edição futura). */
export async function finalizarMinutaEditalAction(
  minutaEditalId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  await exigirAgenteContratacao();
  const resultado = await obterMinutaEditalEditavelOuErro(minutaEditalId);
  if ("erro" in resultado) return { erro: resultado.erro };

  const dados = parseMinutaEditalFormData(formData);
  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim();
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim();

  const erro = validarMinutaEditalParaFinalizar(dados, responsavelNome, responsavelMatricula);
  if (erro) return { erro };

  await prisma.minutaEdital.update({
    where: { id: minutaEditalId },
    data: { ...dados, responsavelNome, responsavelMatricula, status: "FINALIZADO", finalizadoEm: new Date() },
  });

  await avancarStatusLicitacaoSeNecessario(resultado.minuta.consolidacaoTecnicaId, "MINUTAS", responsavelNome);

  revalidatePath(`/agente-contratacao/${resultado.minuta.consolidacaoTecnicaId}`);
  revalidatePath(`/licitacoes/${resultado.minuta.consolidacaoTecnicaId}`);
  return {};
}

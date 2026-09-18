"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirPlanejamento } from "@/lib/auth";
import { validarTermoReferenciaParaFinalizar, type DadosTermoReferencia } from "@/lib/termo-referencia";
import { avancarStatusLicitacaoSeNecessario } from "./avancar-status";
import type { ResultadoAcao } from "./tipos";

function parseTermoReferenciaFormData(formData: FormData): DadosTermoReferencia {
  const campo = (nome: string) => String(formData.get(nome) ?? "").trim();
  return {
    requisitosContratacao: campo("requisitosContratacao"),
    modeloExecucaoObjeto: campo("modeloExecucaoObjeto"),
    modeloGestaoContrato: campo("modeloGestaoContrato"),
    criteriosMedicaoPagamento: campo("criteriosMedicaoPagamento"),
    formaSelecaoFornecedor: campo("formaSelecaoFornecedor"),
    exigenciasHabilitacao: campo("exigenciasHabilitacao"),
    adequacaoOrcamentaria: campo("adequacaoOrcamentaria"),
    garantiaExecucao: campo("garantiaExecucao"),
  };
}

export interface ResultadoCriarTermoReferencia extends ResultadoAcao {
  termoReferenciaId?: string;
}

/** Cria o TR da consolidação — idempotente: se já existir, só devolve o id
 * existente. Só pode ser iniciado com o ETP e a Pesquisa de Preços já
 * finalizados, já que o TR se apoia no conteúdo dos dois. */
export async function criarTermoReferenciaAction(consolidacaoTecnicaId: string): Promise<ResultadoCriarTermoReferencia> {
  await exigirPlanejamento();

  const consolidacao = await prisma.consolidacaoTecnica.findUnique({
    where: { id: consolidacaoTecnicaId },
    include: { estudoTecnicoPreliminar: true, pesquisaDePrecos: true },
  });
  if (!consolidacao) return { erro: "Consolidação não encontrada." };

  const existente = await prisma.termoReferencia.findUnique({ where: { consolidacaoTecnicaId } });
  if (existente) return { termoReferenciaId: existente.id };

  if (consolidacao.estudoTecnicoPreliminar?.status !== "FINALIZADO") {
    return { erro: "O Estudo Técnico Preliminar desta consolidação ainda não foi finalizado." };
  }
  if (consolidacao.pesquisaDePrecos?.status !== "FINALIZADO") {
    return { erro: "A Pesquisa de Preços desta consolidação ainda não foi finalizada." };
  }

  const tr = await prisma.termoReferencia.create({
    data: {
      consolidacaoTecnicaId,
      requisitosContratacao: "",
      modeloExecucaoObjeto: "",
      modeloGestaoContrato: "",
      criteriosMedicaoPagamento: "",
      formaSelecaoFornecedor: "",
      exigenciasHabilitacao: "",
      adequacaoOrcamentaria: "",
      garantiaExecucao: "",
    },
  });

  revalidatePath(`/planejamento/${consolidacaoTecnicaId}`);
  return { termoReferenciaId: tr.id };
}

async function obterTermoReferenciaEditavelOuErro(termoReferenciaId: string) {
  const tr = await prisma.termoReferencia.findUnique({
    where: { id: termoReferenciaId },
    include: { consolidacaoTecnica: true },
  });
  if (!tr) return { erro: "Termo de Referência não encontrado." };
  if (tr.status === "FINALIZADO") {
    return { erro: "Este Termo de Referência já foi finalizado e não pode mais ser editado." };
  }
  return { tr };
}

/** Salva o TR como rascunho — sem exigir todas as seções preenchidas. */
export async function salvarTermoReferenciaRascunhoAction(
  termoReferenciaId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  await exigirPlanejamento();
  const resultado = await obterTermoReferenciaEditavelOuErro(termoReferenciaId);
  if ("erro" in resultado) return { erro: resultado.erro };

  const dados = parseTermoReferenciaFormData(formData);
  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim() || null;
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim() || null;

  await prisma.termoReferencia.update({
    where: { id: termoReferenciaId },
    data: { ...dados, responsavelNome, responsavelMatricula },
  });

  revalidatePath(`/planejamento/${resultado.tr.consolidacaoTecnicaId}`);
  return {};
}

/** Valida todas as seções e o responsável, e finaliza o TR (bloqueia edição futura). */
export async function finalizarTermoReferenciaAction(
  termoReferenciaId: string,
  formData: FormData,
): Promise<ResultadoAcao> {
  await exigirPlanejamento();
  const resultado = await obterTermoReferenciaEditavelOuErro(termoReferenciaId);
  if ("erro" in resultado) return { erro: resultado.erro };

  const dados = parseTermoReferenciaFormData(formData);
  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim();
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim();

  const erro = validarTermoReferenciaParaFinalizar(dados, responsavelNome, responsavelMatricula);
  if (erro) return { erro };

  await prisma.termoReferencia.update({
    where: { id: termoReferenciaId },
    data: { ...dados, responsavelNome, responsavelMatricula, status: "FINALIZADO", finalizadoEm: new Date() },
  });

  await avancarStatusLicitacaoSeNecessario(resultado.tr.consolidacaoTecnicaId, "TERMO_REFERENCIA", responsavelNome);

  revalidatePath(`/planejamento/${resultado.tr.consolidacaoTecnicaId}`);
  revalidatePath(`/licitacoes/${resultado.tr.consolidacaoTecnicaId}`);
  return {};
}

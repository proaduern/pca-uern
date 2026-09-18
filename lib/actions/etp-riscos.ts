"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { exigirSetorTecnico } from "@/lib/auth";
import {
  validarEtpParaFinalizar,
  validarRiscosParaFinalizar,
  type DadosEtp,
  type DadosRiscoItem,
} from "@/lib/etp-riscos";
import { RISCOS_PADRAO } from "@/lib/riscos-padrao";
import type { ResultadoAcao } from "./tipos";

async function obterConsolidacaoDoSetorOuErro(consolidacaoTecnicaId: string, setorTecnicoId: string) {
  const consolidacao = await prisma.consolidacaoTecnica.findUnique({ where: { id: consolidacaoTecnicaId } });
  if (!consolidacao || consolidacao.setorTecnicoId !== setorTecnicoId) {
    return { erro: "Esta consolidação não pertence ao seu setor técnico." };
  }
  return { consolidacao };
}

// ---------------------------------------------------------------------------
// ETP
// ---------------------------------------------------------------------------

function parseEtpFormData(formData: FormData): DadosEtp {
  const campo = (nome: string) => String(formData.get(nome) ?? "").trim();
  return {
    objeto: campo("objeto"),
    localEntregaPrestacao: campo("localEntregaPrestacao"),
    necessidadeContratacao: campo("necessidadeContratacao"),
    referenciaPca: campo("referenciaPca"),
    requisitosContratacao: campo("requisitosContratacao"),
    estimativaQuantidadesMemoria: campo("estimativaQuantidadesMemoria"),
    levantamentoMercadoJustificativa: campo("levantamentoMercadoJustificativa"),
    estimativaPreliminarPrecos: campo("estimativaPreliminarPrecos"),
    descricaoSolucaoCompleta: campo("descricaoSolucaoCompleta"),
    justificativaParcelamento: campo("justificativaParcelamento"),
    resultadosEsperados: campo("resultadosEsperados"),
    providenciasAdministracao: campo("providenciasAdministracao"),
    contratacoesCorrelatas: campo("contratacoesCorrelatas"),
    impactosAmbientais: campo("impactosAmbientais"),
    declaracaoViabilidade: campo("declaracaoViabilidade"),
  };
}

export interface ResultadoCriarEtp extends ResultadoAcao {
  etpId?: string;
}

/** Cria o ETP da consolidação (idempotente: se já existir, só devolve o id existente). */
export async function criarEtpAction(consolidacaoTecnicaId: string): Promise<ResultadoCriarEtp> {
  const sessao = await exigirSetorTecnico();
  const resultado = await obterConsolidacaoDoSetorOuErro(consolidacaoTecnicaId, sessao.id);
  if ("erro" in resultado) return { erro: resultado.erro };

  const existente = await prisma.estudoTecnicoPreliminar.findUnique({ where: { consolidacaoTecnicaId } });
  if (existente) return { etpId: existente.id };

  const categoria = await prisma.categoria.findUniqueOrThrow({ where: { id: resultado.consolidacao.categoriaId } });

  const etp = await prisma.estudoTecnicoPreliminar.create({
    data: {
      consolidacaoTecnicaId,
      objeto: categoria.nome,
      localEntregaPrestacao: "",
      necessidadeContratacao: "",
      referenciaPca: "",
      requisitosContratacao: "",
      estimativaQuantidadesMemoria: "",
      levantamentoMercadoJustificativa: "",
      estimativaPreliminarPrecos: "",
      descricaoSolucaoCompleta: "",
      justificativaParcelamento: "",
      resultadosEsperados: "",
      providenciasAdministracao: "",
      contratacoesCorrelatas: "",
      impactosAmbientais: "",
      declaracaoViabilidade: "",
    },
  });
  return { etpId: etp.id };
}

async function obterEtpEditavelDoSetorOuErro(etpId: string, setorTecnicoId: string) {
  const etp = await prisma.estudoTecnicoPreliminar.findUnique({
    where: { id: etpId },
    include: { consolidacaoTecnica: true },
  });
  if (!etp || etp.consolidacaoTecnica.setorTecnicoId !== setorTecnicoId) {
    return { erro: "ETP não encontrado." };
  }
  if (etp.status === "FINALIZADO") {
    return { erro: "Este ETP já foi finalizado e não pode mais ser editado." };
  }
  return { etp };
}

/** Salva o ETP como rascunho — sem exigir todas as seções preenchidas. */
export async function salvarEtpRascunhoAction(etpId: string, formData: FormData): Promise<ResultadoAcao> {
  const sessao = await exigirSetorTecnico();
  const resultado = await obterEtpEditavelDoSetorOuErro(etpId, sessao.id);
  if ("erro" in resultado) return { erro: resultado.erro };

  const dados = parseEtpFormData(formData);
  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim() || null;
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim() || null;

  await prisma.estudoTecnicoPreliminar.update({
    where: { id: etpId },
    data: { ...dados, responsavelNome, responsavelMatricula },
  });

  revalidatePath(`/consolidacao/${resultado.etp.consolidacaoTecnica.categoriaId}/etp/${resultado.etp.consolidacaoTecnicaId}`);
  return {};
}

/** Valida todas as seções e o responsável, e finaliza o ETP (bloqueia edição futura). */
export async function finalizarEtpAction(etpId: string, formData: FormData): Promise<ResultadoAcao> {
  const sessao = await exigirSetorTecnico();
  const resultado = await obterEtpEditavelDoSetorOuErro(etpId, sessao.id);
  if ("erro" in resultado) return { erro: resultado.erro };

  const dados = parseEtpFormData(formData);
  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim();
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim();

  const erro = validarEtpParaFinalizar(dados, responsavelNome, responsavelMatricula);
  if (erro) return { erro };

  await prisma.estudoTecnicoPreliminar.update({
    where: { id: etpId },
    data: { ...dados, responsavelNome, responsavelMatricula, status: "FINALIZADO", finalizadoEm: new Date() },
  });

  revalidatePath(`/consolidacao/${resultado.etp.consolidacaoTecnica.categoriaId}/etp/${resultado.etp.consolidacaoTecnicaId}`);
  return {};
}

// ---------------------------------------------------------------------------
// Análise de Riscos
// ---------------------------------------------------------------------------

export interface ResultadoCriarRiscos extends ResultadoAcao {
  analiseRiscosId?: string;
}

/** Cria a Análise de Riscos da consolidação, pré-carregada com os 16 riscos-padrão. */
export async function criarAnaliseRiscosAction(consolidacaoTecnicaId: string): Promise<ResultadoCriarRiscos> {
  const sessao = await exigirSetorTecnico();
  const resultado = await obterConsolidacaoDoSetorOuErro(consolidacaoTecnicaId, sessao.id);
  if ("erro" in resultado) return { erro: resultado.erro };

  const existente = await prisma.analiseRiscos.findUnique({ where: { consolidacaoTecnicaId } });
  if (existente) return { analiseRiscosId: existente.id };

  const analiseRiscos = await prisma.analiseRiscos.create({
    data: {
      consolidacaoTecnicaId,
      itens: {
        create: RISCOS_PADRAO.map((r, ordem) => ({ ordem, ...r })),
      },
    },
  });
  return { analiseRiscosId: analiseRiscos.id };
}

async function obterRiscosEditavelDoSetorOuErro(analiseRiscosId: string, setorTecnicoId: string) {
  const analiseRiscos = await prisma.analiseRiscos.findUnique({
    where: { id: analiseRiscosId },
    include: { consolidacaoTecnica: true },
  });
  if (!analiseRiscos || analiseRiscos.consolidacaoTecnica.setorTecnicoId !== setorTecnicoId) {
    return { erro: "Análise de Riscos não encontrada." };
  }
  if (analiseRiscos.status === "FINALIZADO") {
    return { erro: "Esta Análise de Riscos já foi finalizada e não pode mais ser editada." };
  }
  return { analiseRiscos };
}

const FASES_VALIDAS = ["PLANEJAMENTO", "SELECAO_FORNECEDOR", "GESTAO_CONTRATO"];
const PROBABILIDADES_VALIDAS = ["BAIXA", "MEDIA", "ALTA"];
const IMPACTOS_VALIDOS = ["BAIXO", "MEDIO", "ALTO"];
const NIVEIS_ACEITACAO_VALIDOS = ["ACEITAVEL", "ACEITACAO_INTERMEDIARIA", "INACEITAVEL"];

/** Faz o parse defensivo do JSON de itens enviado pelo formulário — nunca confia cegamente no cliente. */
function parseItensRiscoJson(itensJson: string): { erro: string } | { itens: DadosRiscoItem[] } {
  let bruto: unknown;
  try {
    bruto = JSON.parse(itensJson);
  } catch {
    return { erro: "Lista de riscos inválida." };
  }
  if (!Array.isArray(bruto)) return { erro: "Lista de riscos inválida." };

  const itens: DadosRiscoItem[] = [];
  for (const linha of bruto) {
    if (typeof linha !== "object" || linha === null) return { erro: "Lista de riscos inválida." };
    const l = linha as Record<string, unknown>;
    if (!FASES_VALIDAS.includes(String(l.fase))) return { erro: "Fase de risco inválida." };
    if (!PROBABILIDADES_VALIDAS.includes(String(l.probabilidade))) return { erro: "Probabilidade de risco inválida." };
    if (!IMPACTOS_VALIDOS.includes(String(l.impacto))) return { erro: "Grau de impacto inválido." };
    if (!NIVEIS_ACEITACAO_VALIDOS.includes(String(l.nivelAceitacao))) return { erro: "Nível de aceitação inválido." };
    itens.push({
      fase: l.fase as DadosRiscoItem["fase"],
      descricao: String(l.descricao ?? "").trim(),
      danos: String(l.danos ?? "").trim(),
      probabilidade: l.probabilidade as DadosRiscoItem["probabilidade"],
      impacto: l.impacto as DadosRiscoItem["impacto"],
      nivelAceitacao: l.nivelAceitacao as DadosRiscoItem["nivelAceitacao"],
      acoesPreventivas: String(l.acoesPreventivas ?? "").trim(),
      acoesContingenciais: String(l.acoesContingenciais ?? "").trim(),
      responsavel: String(l.responsavel ?? "").trim(),
    });
  }
  return { itens };
}

async function salvarItensRisco(analiseRiscosId: string, itens: DadosRiscoItem[]) {
  await prisma.$transaction([
    prisma.riscoItem.deleteMany({ where: { analiseRiscosId } }),
    prisma.riscoItem.createMany({
      data: itens.map((item, ordem) => ({ analiseRiscosId, ordem, ...item })),
    }),
  ]);
}

/** Salva a Análise de Riscos como rascunho — substitui todas as linhas pelas enviadas. */
export async function salvarRiscosRascunhoAction(analiseRiscosId: string, formData: FormData): Promise<ResultadoAcao> {
  const sessao = await exigirSetorTecnico();
  const resultado = await obterRiscosEditavelDoSetorOuErro(analiseRiscosId, sessao.id);
  if ("erro" in resultado) return { erro: resultado.erro };

  const parse = parseItensRiscoJson(String(formData.get("itensJson") ?? "[]"));
  if ("erro" in parse) return { erro: parse.erro };

  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim() || null;
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim() || null;

  await salvarItensRisco(analiseRiscosId, parse.itens);
  await prisma.analiseRiscos.update({ where: { id: analiseRiscosId }, data: { responsavelNome, responsavelMatricula } });

  revalidatePath(
    `/consolidacao/${resultado.analiseRiscos.consolidacaoTecnica.categoriaId}/riscos/${resultado.analiseRiscos.consolidacaoTecnicaId}`,
  );
  return {};
}

/** Valida os riscos e o responsável, e finaliza a Análise de Riscos (bloqueia edição futura). */
export async function finalizarRiscosAction(analiseRiscosId: string, formData: FormData): Promise<ResultadoAcao> {
  const sessao = await exigirSetorTecnico();
  const resultado = await obterRiscosEditavelDoSetorOuErro(analiseRiscosId, sessao.id);
  if ("erro" in resultado) return { erro: resultado.erro };

  const parse = parseItensRiscoJson(String(formData.get("itensJson") ?? "[]"));
  if ("erro" in parse) return { erro: parse.erro };

  const responsavelNome = String(formData.get("responsavelNome") ?? "").trim();
  const responsavelMatricula = String(formData.get("responsavelMatricula") ?? "").trim();

  const erro = validarRiscosParaFinalizar(parse.itens, responsavelNome, responsavelMatricula);
  if (erro) return { erro };

  await salvarItensRisco(analiseRiscosId, parse.itens);
  await prisma.analiseRiscos.update({
    where: { id: analiseRiscosId },
    data: { responsavelNome, responsavelMatricula, status: "FINALIZADO", finalizadoEm: new Date() },
  });

  revalidatePath(
    `/consolidacao/${resultado.analiseRiscos.consolidacaoTecnica.categoriaId}/riscos/${resultado.analiseRiscos.consolidacaoTecnicaId}`,
  );
  return {};
}

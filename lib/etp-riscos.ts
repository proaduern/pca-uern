/**
 * Estudo Técnico Preliminar (ETP) e Análise de Riscos, elaborados pelo Setor
 * Técnico dentro do sistema — seções fixas do modelo padrão UERN/AGU
 * (Lei 14.133/2021, art. 18 §1º), uma por campo de EstudoTecnicoPreliminar.
 */

export interface SecaoEtp {
  campo: string;
  numero: string;
  titulo: string;
}

/** Ordem e rótulo de cada seção — única fonte usada pelo formulário e pelo PDF. */
export const SECOES_ETP: SecaoEtp[] = [
  { campo: "necessidadeContratacao", numero: "2", titulo: "Necessidade da Contratação" },
  { campo: "referenciaPca", numero: "3", titulo: "Referência ao Plano Anual de Contratações e Planejamento Institucional" },
  { campo: "requisitosContratacao", numero: "4", titulo: "Requisitos da Contratação" },
  { campo: "estimativaQuantidadesMemoria", numero: "5", titulo: "Estimativa das Quantidades e Memória de Cálculo" },
  { campo: "levantamentoMercadoJustificativa", numero: "6", titulo: "Levantamento de Mercado e Justificativa da Solução Escolhida" },
  { campo: "estimativaPreliminarPrecos", numero: "7", titulo: "Estimativa Preliminar de Preços" },
  { campo: "descricaoSolucaoCompleta", numero: "8", titulo: "Descrição da Solução como um Todo" },
  { campo: "justificativaParcelamento", numero: "9", titulo: "Justificativa para o Parcelamento ou Não da Solução" },
  { campo: "resultadosEsperados", numero: "10", titulo: "Demonstrativo dos Resultados Pretendidos" },
  { campo: "providenciasAdministracao", numero: "11", titulo: "Providências a Serem Adotadas pela Administração" },
  { campo: "contratacoesCorrelatas", numero: "12", titulo: "Contratações Correlatas e/ou Interdependentes" },
  { campo: "impactosAmbientais", numero: "13", titulo: "Possíveis Impactos Ambientais e Medidas Mitigadoras" },
  { campo: "declaracaoViabilidade", numero: "14", titulo: "Declaração de Viabilidade (ou Não) da Contratação" },
];

export interface DadosEtp {
  objeto: string;
  localEntregaPrestacao: string;
  necessidadeContratacao: string;
  referenciaPca: string;
  requisitosContratacao: string;
  estimativaQuantidadesMemoria: string;
  levantamentoMercadoJustificativa: string;
  estimativaPreliminarPrecos: string;
  descricaoSolucaoCompleta: string;
  justificativaParcelamento: string;
  resultadosEsperados: string;
  providenciasAdministracao: string;
  contratacoesCorrelatas: string;
  impactosAmbientais: string;
  declaracaoViabilidade: string;
}

const CAMPOS_ETP: (keyof DadosEtp)[] = [
  "objeto",
  "localEntregaPrestacao",
  "necessidadeContratacao",
  "referenciaPca",
  "requisitosContratacao",
  "estimativaQuantidadesMemoria",
  "levantamentoMercadoJustificativa",
  "estimativaPreliminarPrecos",
  "descricaoSolucaoCompleta",
  "justificativaParcelamento",
  "resultadosEsperados",
  "providenciasAdministracao",
  "contratacoesCorrelatas",
  "impactosAmbientais",
  "declaracaoViabilidade",
];

/** Para finalizar o ETP, todas as seções e os dados do responsável precisam estar preenchidos. */
export function validarEtpParaFinalizar(
  etp: DadosEtp,
  responsavelNome: string,
  responsavelMatricula: string,
): string | null {
  for (const campo of CAMPOS_ETP) {
    if (!etp[campo]?.trim()) {
      const secao = SECOES_ETP.find((s) => s.campo === campo);
      const rotulo = secao ? `${secao.numero}. ${secao.titulo}` : campo;
      return `Preencha a seção "${rotulo}" antes de finalizar o ETP.`;
    }
  }
  if (!responsavelNome.trim() || !responsavelMatricula.trim()) {
    return "Informe o nome e a matrícula do responsável pela elaboração do ETP.";
  }
  return null;
}

export interface DadosRiscoItem {
  fase: "PLANEJAMENTO" | "SELECAO_FORNECEDOR" | "GESTAO_CONTRATO";
  descricao: string;
  danos: string;
  probabilidade: "BAIXA" | "MEDIA" | "ALTA";
  impacto: "BAIXO" | "MEDIO" | "ALTO";
  nivelAceitacao: "ACEITAVEL" | "ACEITACAO_INTERMEDIARIA" | "INACEITAVEL";
  acoesPreventivas: string;
  acoesContingenciais: string;
  responsavel: string;
}

/** Para finalizar a Análise de Riscos, precisa de ao menos um risco e todos os campos de cada linha preenchidos. */
export function validarRiscosParaFinalizar(
  itens: DadosRiscoItem[],
  responsavelNome: string,
  responsavelMatricula: string,
): string | null {
  if (itens.length === 0) {
    return "Adicione ao menos um risco antes de finalizar a análise.";
  }
  for (let i = 0; i < itens.length; i++) {
    const it = itens[i];
    if (!it.descricao.trim() || !it.danos.trim() || !it.acoesPreventivas.trim() || !it.acoesContingenciais.trim() || !it.responsavel.trim()) {
      return `Preencha todos os campos do risco nº ${i + 1} antes de finalizar.`;
    }
  }
  if (!responsavelNome.trim() || !responsavelMatricula.trim()) {
    return "Informe o nome e a matrícula do responsável pela elaboração da Análise de Riscos.";
  }
  return null;
}

export const FASE_RISCO_LABEL: Record<DadosRiscoItem["fase"], string> = {
  PLANEJAMENTO: "Planejamento",
  SELECAO_FORNECEDOR: "Seleção do Fornecedor",
  GESTAO_CONTRATO: "Gestão do Contrato",
};

export const PROBABILIDADE_RISCO_LABEL: Record<DadosRiscoItem["probabilidade"], string> = {
  BAIXA: "Baixa",
  MEDIA: "Média",
  ALTA: "Alta",
};

export const IMPACTO_RISCO_LABEL: Record<DadosRiscoItem["impacto"], string> = {
  BAIXO: "Baixo",
  MEDIO: "Médio",
  ALTO: "Alto",
};

export const NIVEL_ACEITACAO_RISCO_LABEL: Record<DadosRiscoItem["nivelAceitacao"], string> = {
  ACEITAVEL: "Aceitável",
  ACEITACAO_INTERMEDIARIA: "Aceitação Intermediária",
  INACEITAVEL: "Inaceitável",
};

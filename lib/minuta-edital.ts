/**
 * Minuta de Edital, elaborada pelo Agente de Contratação — seções próprias
 * do modelo padrão AGU (Lei 14.133/2021), uma por campo de MinutaEdital. As
 * seções que já existem no ETP e no Termo de Referência (objeto, requisitos
 * da contratação, critérios de julgamento/seleção do fornecedor, exigências
 * de habilitação) não são redigitadas aqui — o formulário e o PDF as puxam
 * direto desses dois documentos, que precisam estar finalizados antes de a
 * minuta poder ser iniciada (ver lib/actions/minuta-edital.ts).
 */

export interface SecaoMinuta {
  campo: string;
  numero: string;
  titulo: string;
}

/** Ordem e rótulo de cada seção própria da minuta — única fonte usada pelo
 * formulário e pelo PDF. A numeração continua a do TR (que ocupa 1 a 22 no
 * documento combinado, com 1-14 do ETP e 15-22 do próprio TR), começando em 23. */
export const SECOES_MINUTA: SecaoMinuta[] = [
  { campo: "condicoesParticipacao", numero: "23", titulo: "Das Condições de Participação" },
  { campo: "credenciamento", numero: "24", titulo: "Do Credenciamento" },
  { campo: "apresentacaoProposta", numero: "25", titulo: "Da Apresentação da Proposta" },
  { campo: "julgamentoPropostas", numero: "26", titulo: "Do Julgamento das Propostas" },
  { campo: "documentosHabilitacao", numero: "27", titulo: "Dos Documentos de Habilitação" },
  { campo: "recursosAdministrativos", numero: "28", titulo: "Dos Recursos Administrativos" },
  { campo: "sancoesAdministrativas", numero: "29", titulo: "Das Sanções Administrativas" },
  { campo: "disposicoesGerais", numero: "30", titulo: "Disposições Gerais" },
];

export interface DadosMinutaEdital {
  condicoesParticipacao: string;
  credenciamento: string;
  apresentacaoProposta: string;
  julgamentoPropostas: string;
  documentosHabilitacao: string;
  recursosAdministrativos: string;
  sancoesAdministrativas: string;
  disposicoesGerais: string;
}

const CAMPOS_MINUTA: (keyof DadosMinutaEdital)[] = [
  "condicoesParticipacao",
  "credenciamento",
  "apresentacaoProposta",
  "julgamentoPropostas",
  "documentosHabilitacao",
  "recursosAdministrativos",
  "sancoesAdministrativas",
  "disposicoesGerais",
];

/** Para finalizar a minuta, todas as seções próprias e os dados do
 * responsável precisam estar preenchidos (o ETP e o TR já foram validados
 * como finalizados no momento de criar a minuta). */
export function validarMinutaEditalParaFinalizar(
  minuta: DadosMinutaEdital,
  responsavelNome: string,
  responsavelMatricula: string,
): string | null {
  for (const campo of CAMPOS_MINUTA) {
    if (!minuta[campo]?.trim()) {
      const secao = SECOES_MINUTA.find((s) => s.campo === campo);
      const rotulo = secao ? `${secao.numero}. ${secao.titulo}` : campo;
      return `Preencha a seção "${rotulo}" antes de finalizar a Minuta de Edital.`;
    }
  }
  if (!responsavelNome.trim() || !responsavelMatricula.trim()) {
    return "Informe o nome e a matrícula do responsável pela elaboração da Minuta de Edital.";
  }
  return null;
}

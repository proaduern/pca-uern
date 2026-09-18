/**
 * Termo de Referência (TR), elaborado pelo subsetor Planejamento — seções
 * próprias do modelo padrão AGU (Lei 14.133/2021, art. 6º XXIII), uma por
 * campo de TermoReferencia. As seções que já existem no ETP e na Pesquisa
 * de Preços (objeto, necessidade da contratação, descrição da solução,
 * estimativa de valor) não são redigitadas aqui — o formulário e o PDF as
 * puxam direto desses dois documentos, que precisam estar finalizados antes
 * de o TR poder ser iniciado (ver lib/actions/termo-referencia.ts).
 */

export interface SecaoTR {
  campo: string;
  numero: string;
  titulo: string;
}

/** Ordem e rótulo de cada seção própria do TR — única fonte usada pelo
 * formulário e pelo PDF. A numeração continua a do ETP (que ocupa 1 a 14 no
 * documento combinado), começando em 15. */
export const SECOES_TR: SecaoTR[] = [
  { campo: "requisitosContratacao", numero: "15", titulo: "Requisitos da Contratação" },
  { campo: "modeloExecucaoObjeto", numero: "16", titulo: "Modelo de Execução do Objeto" },
  { campo: "modeloGestaoContrato", numero: "17", titulo: "Modelo de Gestão do Contrato" },
  { campo: "criteriosMedicaoPagamento", numero: "18", titulo: "Critérios de Medição e de Pagamento" },
  { campo: "formaSelecaoFornecedor", numero: "19", titulo: "Forma e Critério de Seleção do Fornecedor" },
  { campo: "exigenciasHabilitacao", numero: "20", titulo: "Exigências de Habilitação" },
  { campo: "adequacaoOrcamentaria", numero: "21", titulo: "Adequação Orçamentária" },
  { campo: "garantiaExecucao", numero: "22", titulo: "Garantia de Execução" },
];

export interface DadosTermoReferencia {
  requisitosContratacao: string;
  modeloExecucaoObjeto: string;
  modeloGestaoContrato: string;
  criteriosMedicaoPagamento: string;
  formaSelecaoFornecedor: string;
  exigenciasHabilitacao: string;
  adequacaoOrcamentaria: string;
  garantiaExecucao: string;
}

const CAMPOS_TR: (keyof DadosTermoReferencia)[] = [
  "requisitosContratacao",
  "modeloExecucaoObjeto",
  "modeloGestaoContrato",
  "criteriosMedicaoPagamento",
  "formaSelecaoFornecedor",
  "exigenciasHabilitacao",
  "adequacaoOrcamentaria",
  "garantiaExecucao",
];

/** Para finalizar o TR, todas as seções próprias e os dados do responsável
 * precisam estar preenchidos (o ETP e a Pesquisa de Preços já foram
 * validados como finalizados no momento de criar o TR). */
export function validarTermoReferenciaParaFinalizar(
  tr: DadosTermoReferencia,
  responsavelNome: string,
  responsavelMatricula: string,
): string | null {
  for (const campo of CAMPOS_TR) {
    if (!tr[campo]?.trim()) {
      const secao = SECOES_TR.find((s) => s.campo === campo);
      const rotulo = secao ? `${secao.numero}. ${secao.titulo}` : campo;
      return `Preencha a seção "${rotulo}" antes de finalizar o Termo de Referência.`;
    }
  }
  if (!responsavelNome.trim() || !responsavelMatricula.trim()) {
    return "Informe o nome e a matrícula do responsável pela elaboração do Termo de Referência.";
  }
  return null;
}

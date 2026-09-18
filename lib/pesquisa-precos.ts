/**
 * Pesquisa de Preços, elaborada pelo subsetor PesquisaPrecos (vinculado a
 * Licitações) dentro do sistema — um por ConsolidacaoTecnica. O PDF enviado
 * é lido apenas para referência/auditoria (o texto extraído fica guardado);
 * os valores pesquisados de cada item são sempre digitados e confirmados
 * pelo próprio servidor, nunca preenchidos automaticamente a partir do PDF.
 */

export interface DadosPesquisaPrecoItem {
  item: string;
  quantidade: number;
  valorUnitarioPesquisado: number;
  medianaPesquisada: number | null;
  fontesConsultadas: string;
}

/** Para finalizar, cada item precisa de um valor pesquisado (> 0) e das
 * fontes consultadas, além da metodologia e do responsável preenchidos. */
export function validarPesquisaPrecosParaFinalizar(
  itens: DadosPesquisaPrecoItem[],
  metodologia: string,
  responsavelNome: string,
  responsavelMatricula: string,
): string | null {
  if (itens.length === 0) {
    return "Não há itens para pesquisar preços nesta consolidação.";
  }
  for (let i = 0; i < itens.length; i++) {
    const it = itens[i];
    if (!(it.valorUnitarioPesquisado > 0)) {
      return `Informe o valor unitário pesquisado do item nº ${i + 1} (${it.item}).`;
    }
    if (!it.fontesConsultadas.trim()) {
      return `Informe as fontes consultadas do item nº ${i + 1} (${it.item}).`;
    }
  }
  if (!metodologia.trim()) {
    return "Descreva a metodologia da pesquisa de preços.";
  }
  if (!responsavelNome.trim() || !responsavelMatricula.trim()) {
    return "Informe o nome e a matrícula do responsável pela pesquisa de preços.";
  }
  return null;
}

export function totalPesquisaPrecos(itens: DadosPesquisaPrecoItem[]): number {
  return itens.reduce((soma, it) => soma + it.quantidade * it.valorUnitarioPesquisado, 0);
}

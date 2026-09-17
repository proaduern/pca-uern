export interface ItemPesquisaPrecoParaPdf {
  item: string;
  quantidade: number;
  valorUnitarioPesquisado: number;
}

export interface PesquisaPrecosParaPdf {
  processoSEI: string;
  categoriaNome: string;
  metodologia: string;
  arquivoPdfNome: string | null;
  status: "RASCUNHO" | "FINALIZADO";
  responsavelNome: string | null;
  responsavelMatricula: string | null;
  finalizadoEm: Date | null;
  itens: ItemPesquisaPrecoParaPdf[];
}

export function totalPesquisaPrecosPdf(pesquisa: PesquisaPrecosParaPdf): number {
  return pesquisa.itens.reduce((soma, it) => soma + it.quantidade * it.valorUnitarioPesquisado, 0);
}

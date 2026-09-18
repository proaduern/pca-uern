import type { DadosTermoReferencia } from "../termo-referencia";

export interface ItemTrParaPdf {
  nome: string;
  quantidade: number | null;
  valorUnit: number | null;
  valorTotal: number;
}

export interface ItemPesquisaTrParaPdf {
  item: string;
  quantidade: number;
  valorUnitarioPesquisado: number;
}

export interface TermoReferenciaParaPdf extends DadosTermoReferencia {
  processoSEI: string;
  categoriaNome: string;

  // Puxado do ETP (já finalizado)
  objeto: string;
  necessidadeContratacao: string;
  referenciaPca: string;
  descricaoSolucaoCompleta: string;

  // Puxado da Pesquisa de Preços (já finalizada)
  metodologiaPesquisa: string;
  itensPesquisa: ItemPesquisaTrParaPdf[];

  status: "RASCUNHO" | "FINALIZADO";
  responsavelNome: string | null;
  responsavelMatricula: string | null;
  finalizadoEm: Date | null;

  itens: ItemTrParaPdf[];
}

export function totalItensTr(tr: TermoReferenciaParaPdf): number {
  return tr.itens.reduce((soma, it) => soma + it.valorTotal, 0);
}

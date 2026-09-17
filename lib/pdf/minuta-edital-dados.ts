import type { DadosMinutaEdital } from "../minuta-edital";

export interface ItemMinutaParaPdf {
  nome: string;
  quantidade: number | null;
  valorUnit: number | null;
  valorTotal: number;
}

export interface MinutaEditalParaPdf extends DadosMinutaEdital {
  processoSEI: string;
  categoriaNome: string;

  // Puxado do ETP (já finalizado)
  objeto: string;

  // Puxado do Termo de Referência (já finalizado)
  formaSelecaoFornecedor: string;
  exigenciasHabilitacao: string;
  criteriosMedicaoPagamento: string;
  garantiaExecucao: string;

  status: "RASCUNHO" | "FINALIZADO";
  responsavelNome: string | null;
  responsavelMatricula: string | null;
  finalizadoEm: Date | null;

  itens: ItemMinutaParaPdf[];
}

export function totalItensMinuta(minuta: MinutaEditalParaPdf): number {
  return minuta.itens.reduce((soma, it) => soma + it.valorTotal, 0);
}

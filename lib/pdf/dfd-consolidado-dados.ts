export interface ItemConsolidadoPdf {
  enquadramento: "GERAL" | "RECURSOS_EXTRA" | "OP" | "CONVENIO";
  nome: string;
  categoriaNome: string;
  und: string;
  valorUnit: number | null;
  quantidadeTotal: number;
  valorTotal: number;
}

export interface DemandaOrigemPdf {
  itemNome: string;
  unidadeDemandante: string;
  dfdNumero: string;
  dfdAno: number;
  quantidade: number | null;
  valorUnit: number | null;
  valorTotal: number;
  enquadramento: string;
  justificativaOriginal: string;
  substituido: boolean;
  itemOriginalNome: string | null;
  substituicaoJustificativa: string | null;
}

export interface DfdConsolidadoParaPdf {
  id: string;
  processoSEI: string;
  numeroConsolidacao: string;
  pcaAno: number;
  setorTecnicoNome: string;
  categoriaNome: string;
  tipoContratacao: "NORMAL" | "ATA";
  responsavelNome: string;
  responsavelMatricula: string;
  responsavelEmail: string;
  responsavelTelefone: string;
  descricaoSumaria: string;
  tipificacao: string;
  prioridadeNivel: "ALTA" | "MEDIA" | "BAIXA";
  prioridadeRotulo: string;
  prioridadeJustificativa: string;
  justificativaConsolidacao: string;
  dataEntregaConsolidada: Date;
  dataEmissao: Date;
  itensConsolidados: ItemConsolidadoPdf[];
  totalEstimadoGeral: number;
  demandasOrigem: DemandaOrigemPdf[];
}

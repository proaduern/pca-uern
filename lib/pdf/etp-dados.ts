export interface ItemEtpParaPdf {
  nome: string;
  quantidade: number | null;
  valorUnit: number | null;
  valorTotal: number;
}

export interface EtpParaPdf {
  processoSEI: string;
  categoriaNome: string;
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
  status: "RASCUNHO" | "FINALIZADO";
  responsavelNome: string | null;
  responsavelMatricula: string | null;
  finalizadoEm: Date | null;
  itens: ItemEtpParaPdf[];
}

export function totalItensEtp(etp: EtpParaPdf): number {
  return etp.itens.reduce((soma, it) => soma + it.valorTotal, 0);
}

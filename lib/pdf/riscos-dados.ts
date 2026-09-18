import type { DadosRiscoItem } from "../etp-riscos";

export type RiscoItemParaPdf = DadosRiscoItem;

export interface AnaliseRiscosParaPdf {
  processoSEI: string;
  categoriaNome: string;
  status: "RASCUNHO" | "FINALIZADO";
  responsavelNome: string | null;
  responsavelMatricula: string | null;
  finalizadoEm: Date | null;
  itens: RiscoItemParaPdf[];
}

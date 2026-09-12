/** Regras de validação do assistente de DFD, extraídas do sistema original. */

export const DESCRICAO_SUMARIA_MAX = 100;
export const JUSTIFICATIVA_MIN = 100;

export function validarDescricaoSumaria(valor: string): string | null {
  if (!valor.trim()) return "Informe a descrição sumária da demanda.";
  if (valor.length > DESCRICAO_SUMARIA_MAX) {
    return `A descrição sumária deve ter no máximo ${DESCRICAO_SUMARIA_MAX} caracteres.`;
  }
  return null;
}

export function validarJustificativa(valor: string): string | null {
  const tamanho = valor.trim().length;
  if (tamanho < JUSTIFICATIVA_MIN) {
    return `A justificativa deve ter no mínimo ${JUSTIFICATIVA_MIN} caracteres (atualmente ${tamanho}).`;
  }
  return null;
}

export interface DadosItemDfd {
  tipo: "MATERIAL" | "SERVICO";
  enquadramento: "OP" | "GERAL" | "CONVENIO";
  convenioNumero?: string | null;
  convenioAno?: number | null;
  emendaParlamentar?: boolean;
  parlamentarNome?: string | null;
  categoriaId?: string | null;
  itemCatalogoNome?: string | null;
  itemNomeLivre?: string | null;
  quantidade?: number | null;
  valorUnit?: number | null;
  valorTotal: number;
  correlacao: string;
}

export function validarItemDfd(
  it: DadosItemDfd,
  unidadeElegivelOP: boolean,
): string | null {
  if (it.enquadramento === "OP" && !unidadeElegivelOP) {
    return "Esta unidade não é elegível para itens com enquadramento OP.";
  }
  if (it.enquadramento === "CONVENIO") {
    if (!it.convenioNumero || !it.convenioAno) {
      return "Informe o número e o ano do convênio.";
    }
    if (it.emendaParlamentar && !it.parlamentarNome?.trim()) {
      return "Informe o nome do parlamentar autor da emenda.";
    }
  }
  if (!it.categoriaId) {
    return "Selecione a categoria do item.";
  }
  if (!it.itemCatalogoNome && !it.itemNomeLivre) {
    return "Selecione um item do catálogo ou informe o nome do item.";
  }
  if (!(it.valorTotal > 0)) {
    return "O valor total do item deve ser maior que zero.";
  }
  if (!it.correlacao.trim()) {
    return "Explique a correlação da quantidade/valor com a necessidade relatada.";
  }
  return null;
}

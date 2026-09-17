/** Regras de validação do assistente de DFD, extraídas do sistema original. */

export const DESCRICAO_SUMARIA_MAX = 100;
export const JUSTIFICATIVA_MIN = 100;
export const JUSTIFICATIVA_COTA_GERAL_MIN = 50;

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

/** Justificativa da solicitação de autorização de Cota Geral fora da liberação padrão. */
export function validarJustificativaCotaGeral(valor: string): string | null {
  const tamanho = valor.trim().length;
  if (tamanho < JUSTIFICATIVA_COTA_GERAL_MIN) {
    return `Justifique o pedido com no mínimo ${JUSTIFICATIVA_COTA_GERAL_MIN} caracteres (atualmente ${tamanho}).`;
  }
  return null;
}

/**
 * A data pretendida de entrega não pode ser de um ano diferente do PCA em
 * que o DFD foi lançado (ex.: um DFD do PCA 2026 pedindo entrega em 2025).
 * Compara pelo ano do texto "YYYY-MM-DD" do <input type="date">, sem passar
 * por `new Date()`, pra não sofrer deslocamento de fuso horário.
 */
export function validarDataDentroDoAno(
  data: string,
  ano: number,
): string | null {
  const anoDaData = Number(data.slice(0, 4));
  if (!anoDaData || anoDaData !== ano) {
    return `A data pretendida de entrega precisa estar dentro do ano do PCA (${ano}).`;
  }
  return null;
}

export interface DadosItemDfd {
  tipo: "MATERIAL" | "SERVICO";
  enquadramento: "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA";
  convenioNumero?: string | null;
  convenioAno?: number | null;
  emendaParlamentar?: boolean;
  parlamentarNome?: string | null;
  recursoExtraAgencia?: string | null;
  recursoExtraConta?: string | null;
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
  if (it.enquadramento === "RECURSOS_EXTRA") {
    if (!it.recursoExtraAgencia?.trim() || !it.recursoExtraConta?.trim()) {
      return "Informe a agência e a conta bancária de origem do recurso arrecadado pela unidade.";
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

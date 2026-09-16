/**
 * Motor de cota/orçamento do PCA (Plano de Contratações Anual).
 *
 * Regras extraídas do sistema original:
 * - Um DFD compromete orçamento assim que é enviado para aprovação (não
 *   precisa esperar a aprovação da PROAD) — é uma reserva orçamentária.
 * - Itens com enquadramento "Convênio" ou "Recursos Extra" (recursos
 *   arrecadados pela própria unidade) são recursos externos: não contam
 *   para a cota da unidade nem para o saldo geral do PCA.
 * - A cota "OP" só existe para unidades elegíveis (ex.: unidades
 *   universitárias); as demais só têm cota "Geral".
 */

export type StatusDfd = "RASCUNHO" | "AGUARDANDO_APROVACAO" | "APROVADO" | "REPROVADO";
export type Enquadramento = "OP" | "GERAL" | "CONVENIO" | "RECURSOS_EXTRA";

export function dfdComprometeOrcamento(status: StatusDfd): boolean {
  return status === "AGUARDANDO_APROVACAO" || status === "APROVADO";
}

/**
 * Arredonda pra centavos. Somas/subtrações de valores monetários em ponto
 * flutuante acumulam erro binário (ex.: 1000 - 153.18 pode dar
 * 846.8199999999999 em vez de 846.82) — sem isso, lançar um valor igual ao
 * saldo exato era bloqueado por engano, exigindo deixar sempre 1 centavo de
 * sobra. Toda função de saldo abaixo devolve o valor já arredondado.
 */
export function arredondarCentavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export interface ItemParaGasto {
  enquadramento: Enquadramento;
  valorTotal: number;
}

export interface GastosPorEnquadramento {
  op: number;
  geral: number;
  convenio: number;
  recursosExtra: number;
  total: number; // op + geral (convênio e recursos extra são externos, não entram no total interno)
}

/**
 * Soma os gastos de uma lista de itens já filtrada para os DFDs que
 * comprometem orçamento (RASCUNHO e REPROVADO não contam).
 */
export function calcularGastos(itens: ItemParaGasto[]): GastosPorEnquadramento {
  let op = 0;
  let geral = 0;
  let convenio = 0;
  let recursosExtra = 0;
  for (const it of itens) {
    if (it.enquadramento === "OP") op += it.valorTotal;
    else if (it.enquadramento === "CONVENIO") convenio += it.valorTotal;
    else if (it.enquadramento === "RECURSOS_EXTRA") recursosExtra += it.valorTotal;
    else geral += it.valorTotal;
  }
  return {
    op: arredondarCentavos(op),
    geral: arredondarCentavos(geral),
    convenio: arredondarCentavos(convenio),
    recursosExtra: arredondarCentavos(recursosExtra),
    total: arredondarCentavos(op + geral),
  };
}

export function saldoUnidadeOP(cotaOP: number, gastoOP: number): number {
  return arredondarCentavos(cotaOP - gastoOP);
}

export function saldoUnidadeGeral(cotaGeral: number, gastoGeral: number): number {
  return arredondarCentavos(cotaGeral - gastoGeral);
}

export function saldoPCA(cotaGeralPCA: number, gastoTotalPCA: number): number {
  return arredondarCentavos(cotaGeralPCA - gastoTotalPCA);
}

export interface PcaParaJanela {
  concluido: boolean;
  aberturaExtraGeral: boolean;
  dataAbertura: Date;
  dataFechamento: Date;
}

/**
 * A janela de lançamento de DFDs está aberta para uma unidade quando:
 * - o PCA não foi formalmente concluído, E
 * - (a abertura extra geral está ligada) OU (a unidade tem exceção individual)
 *   OU (a data de hoje está dentro do intervalo abertura/fechamento).
 */
export function janelaAberta(
  pca: PcaParaJanela | null,
  unidadeTemExcecao: boolean,
  agora: Date,
): boolean {
  if (!pca) return false;
  if (pca.concluido) return false;
  if (pca.aberturaExtraGeral) return true;
  if (unidadeTemExcecao) return true;

  const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());
  const abertura = new Date(
    pca.dataAbertura.getFullYear(),
    pca.dataAbertura.getMonth(),
    pca.dataAbertura.getDate(),
  );
  const fechamento = new Date(
    pca.dataFechamento.getFullYear(),
    pca.dataFechamento.getMonth(),
    pca.dataFechamento.getDate(),
  );
  return hoje >= abertura && hoje <= fechamento;
}

/**
 * Controle de ALOCAÇÃO de cota às unidades (independente de gasto) —
 * evita que a PROAD cadastre/edite unidades com cota que, somada, ultrapasse
 * o que o PCA ativo comporta.
 */

export type CotaTipo = "FECHADA" | "ABERTA";

export interface UnidadeParaAlocacao {
  id: string;
  elegivelCotaOP: boolean;
  cotaOP: number;
  cotaGeral: number;
  cotaTipo: CotaTipo;
}

export function totalCotaOPAlocada(
  unidades: UnidadeParaAlocacao[],
  excludeUnidadeId?: string | null,
): number {
  return arredondarCentavos(
    unidades
      .filter((u) => u.elegivelCotaOP && u.id !== excludeUnidadeId)
      .reduce((soma, u) => soma + u.cotaOP, 0),
  );
}

export function totalCotaGeralFechadaAlocada(
  unidades: UnidadeParaAlocacao[],
  excludeUnidadeId?: string | null,
): number {
  return arredondarCentavos(
    unidades
      .filter((u) => u.cotaTipo === "FECHADA" && u.id !== excludeUnidadeId)
      .reduce((soma, u) => soma + u.cotaGeral, 0),
  );
}

export function saldoPCAOPParaAlocar(
  pcaCotaOP: number,
  unidades: UnidadeParaAlocacao[],
  excludeUnidadeId?: string | null,
): number {
  return arredondarCentavos(pcaCotaOP - totalCotaOPAlocada(unidades, excludeUnidadeId));
}

export function saldoPCAGeralParaAlocar(
  pca: { cotaGeral: number; cotaOP: number },
  unidades: UnidadeParaAlocacao[],
  excludeUnidadeId?: string | null,
): number {
  return arredondarCentavos(
    pca.cotaGeral - pca.cotaOP - totalCotaGeralFechadaAlocada(unidades, excludeUnidadeId),
  );
}

/**
 * Unidades elegíveis a cota OP sempre têm cota Geral "fechada" (valor fixo)
 * quando o valor informado é positivo, ou "aberta" (usa o saldo do PCA)
 * quando é zero — não é uma escolha manual do admin, ao contrário das
 * unidades não elegíveis a OP.
 */
export function derivarCotaTipo(
  elegivelCotaOP: boolean,
  cotaGeral: number,
  cotaTipoManual: CotaTipo,
): CotaTipo {
  if (elegivelCotaOP) return cotaGeral > 0 ? "FECHADA" : "ABERTA";
  return cotaTipoManual;
}

/** Só unidades com alguma cota "fixa" (OP elegível, ou Geral fechada) disputam o subsaldo do PCA. */
export function exigeCotaFixa(elegivelCotaOP: boolean, cotaTipo: CotaTipo): boolean {
  return elegivelCotaOP || cotaTipo === "FECHADA";
}

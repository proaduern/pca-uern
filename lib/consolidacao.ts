export const PRAZO_MINIMO_DIAS_APOS_ETP = 60;

export function diasEntre(dataInicio: string | Date, dataFim: string | Date): number {
  const inicio = typeof dataInicio === "string" ? new Date(dataInicio) : dataInicio;
  const fim = typeof dataFim === "string" ? new Date(dataFim) : dataFim;
  return Math.round((fim.getTime() - inicio.getTime()) / 86400000);
}

/**
 * A data esperada de conclusão da demanda precisa ser no mínimo
 * PRAZO_MINIMO_DIAS_APOS_ETP dias depois da data do ETP (prazo mínimo de
 * licitação). Retorna a mensagem de erro, ou null se estiver ok.
 */
export function validarDataConclusao(
  dataETP: string | Date,
  dataEsperadaConclusao: string | Date,
): string | null {
  const dias = diasEntre(dataETP, dataEsperadaConclusao);
  if (dias < PRAZO_MINIMO_DIAS_APOS_ETP) {
    return `A data esperada de conclusão deve ser no mínimo ${PRAZO_MINIMO_DIAS_APOS_ETP} dias após a data do ETP (atualmente ${dias} dia(s)).`;
  }
  return null;
}

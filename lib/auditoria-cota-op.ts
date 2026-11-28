import { arredondarCentavos } from "./cota";

export interface UnidadeParaAuditoriaOP {
  id: string;
  nome: string;
  elegivelCotaOP: boolean;
  cotaOP: number;
  ativa: boolean;
}

export interface ItemOpParaAuditoria {
  id: string;
  dfdId: string;
  dfdNumero: number;
  dfdDescricaoSumaria: string;
  dfdStatus: string;
  unidadeId: string;
  unidadeNome: string;
  categoriaNome: string;
  ignoraPCA: boolean;
  fluxoContinuo?: boolean;
  valorTotal: number;
}

export interface DfdResumoOp {
  dfdId: string;
  numero: number;
  descricaoSumaria: string;
  status: string;
  qtdItensOp: number;
  valorPcaOp: number;
  valorForaPcaOp: number;
  valorTotalOp: number;
}

export type StatusAuditoriaOP =
  | "DENTRO_LIMITE"
  | "LIMITE_EXATO"
  | "EXTRAPOLOU"
  | "NAO_ELEGIVEL_COM_OP";

export interface LinhaAuditoriaCotaOP {
  unidadeId: string;
  unidadeNome: string;
  elegivelCotaOP: boolean;
  cotaOP: number;
  demandadoPcaOP: number;
  demandadoForaPcaOP: number;
  totalDemandadoOP: number;
  saldoDisponivel: number;
  percentualUtilizado: number | null;
  status: StatusAuditoriaOP;
  dfds: DfdResumoOp[];
}

export interface ResumoAuditoriaCotaOP {
  ano: number;
  tetoGlobalCotaOP: number;
  totalCotasAlocadas: number;
  totalDemandadoPcaOP: number;
  totalDemandadoForaPcaOP: number;
  totalDemandadoOP: number;
  saldoGlobalOP: number;
  percentualPcaSobreTeto: number;
  percentualTotalSobreTeto: number;
  qtdUnidadesElegiveis: number;
  qtdExtrapoladas: number;
  qtdNaoElegiveisComOP: number;
  linhas: LinhaAuditoriaCotaOP[];
}

/**
 * Consolida a auditoria da Cota OP (Orçamento Participativo) por unidade para um ano do PCA.
 *
 * Separa claramente:
 * - `demandadoPcaOP`: itens OP em categorias que entram no PCA/PNCP (`!ignoraPCA && !fluxoContinuo`)
 * - `demandadoForaPcaOP`: itens OP em categorias que não vão ao PCA/PNCP (ex.: Diárias), mas
 *   que consomem a Cota OP da unidade no controle financeiro.
 * - `totalDemandadoOP`: soma real consumida da Cota OP da unidade.
 *
 * Também detecta automaticamente unidades NÃO elegíveis à Cota OP que possuam itens marcados
 * como OP (`NAO_ELEGIVEL_COM_OP`).
 */
export function calcularAuditoriaCotaOP(params: {
  ano: number;
  tetoGlobalCotaOP: number;
  unidades: UnidadeParaAuditoriaOP[];
  itensOp: ItemOpParaAuditoria[];
}): ResumoAuditoriaCotaOP {
  const { ano, tetoGlobalCotaOP, unidades, itensOp } = params;

  const unidadesPorId = new Map<string, UnidadeParaAuditoriaOP>();
  for (const u of unidades) {
    unidadesPorId.set(u.id, u);
  }

  interface AcumuladorUnidade {
    unidadeId: string;
    unidadeNome: string;
    elegivelCotaOP: boolean;
    cotaOP: number;
    demandadoPcaOP: number;
    demandadoForaPcaOP: number;
    dfdsMapa: Map<string, DfdResumoOp>;
  }

  const mapa = new Map<string, AcumuladorUnidade>();

  // 1. Inclui todas as unidades ativas elegíveis à Cota OP (mesmo com demanda zerada)
  for (const u of unidades) {
    if (u.ativa && u.elegivelCotaOP) {
      mapa.set(u.id, {
        unidadeId: u.id,
        unidadeNome: u.nome,
        elegivelCotaOP: true,
        cotaOP: arredondarCentavos(Number(u.cotaOP) || 0),
        demandadoPcaOP: 0,
        demandadoForaPcaOP: 0,
        dfdsMapa: new Map(),
      });
    }
  }

  // 2. Acumula todos os itens OP (inclusive se houver algum em unidade não elegível)
  for (const it of itensOp) {
    let acc = mapa.get(it.unidadeId);
    if (!acc) {
      const u = unidadesPorId.get(it.unidadeId);
      acc = {
        unidadeId: it.unidadeId,
        unidadeNome: u?.nome ?? it.unidadeNome,
        elegivelCotaOP: u?.elegivelCotaOP ?? false,
        cotaOP: arredondarCentavos(Number(u?.cotaOP) || 0),
        demandadoPcaOP: 0,
        demandadoForaPcaOP: 0,
        dfdsMapa: new Map(),
      };
      mapa.set(it.unidadeId, acc);
    }

    const val = Number(it.valorTotal) || 0;
    const foraDoPca = Boolean(it.ignoraPCA || it.fluxoContinuo);

    if (foraDoPca) {
      acc.demandadoForaPcaOP += val;
    } else {
      acc.demandadoPcaOP += val;
    }

    let dfdAcc = acc.dfdsMapa.get(it.dfdId);
    if (!dfdAcc) {
      dfdAcc = {
        dfdId: it.dfdId,
        numero: it.dfdNumero,
        descricaoSumaria: it.dfdDescricaoSumaria || "(sem descrição)",
        status: it.dfdStatus,
        qtdItensOp: 0,
        valorPcaOp: 0,
        valorForaPcaOp: 0,
        valorTotalOp: 0,
      };
      acc.dfdsMapa.set(it.dfdId, dfdAcc);
    }

    dfdAcc.qtdItensOp += 1;
    if (foraDoPca) {
      dfdAcc.valorForaPcaOp = arredondarCentavos(dfdAcc.valorForaPcaOp + val);
    } else {
      dfdAcc.valorPcaOp = arredondarCentavos(dfdAcc.valorPcaOp + val);
    }
    dfdAcc.valorTotalOp = arredondarCentavos(dfdAcc.valorPcaOp + dfdAcc.valorForaPcaOp);
  }

  const linhas: LinhaAuditoriaCotaOP[] = [];
  let totalCotasAlocadas = 0;
  let totalDemandadoPcaOP = 0;
  let totalDemandadoForaPcaOP = 0;
  let qtdUnidadesElegiveis = 0;
  let qtdExtrapoladas = 0;
  let qtdNaoElegiveisComOP = 0;

  for (const acc of mapa.values()) {
    const demandadoPcaOP = arredondarCentavos(acc.demandadoPcaOP);
    const demandadoForaPcaOP = arredondarCentavos(acc.demandadoForaPcaOP);
    const totalDemandadoOP = arredondarCentavos(demandadoPcaOP + demandadoForaPcaOP);
    const saldoDisponivel = arredondarCentavos(acc.cotaOP - totalDemandadoOP);
    const percentualUtilizado =
      acc.cotaOP > 0 ? Math.round((totalDemandadoOP / acc.cotaOP) * 1000) / 10 : null;

    let status: StatusAuditoriaOP;
    if (!acc.elegivelCotaOP && totalDemandadoOP > 0) {
      status = "NAO_ELEGIVEL_COM_OP";
      qtdNaoElegiveisComOP += 1;
    } else if (saldoDisponivel < 0) {
      status = "EXTRAPOLOU";
      qtdExtrapoladas += 1;
    } else if (saldoDisponivel === 0 && acc.cotaOP > 0) {
      status = "LIMITE_EXATO";
    } else {
      status = "DENTRO_LIMITE";
    }

    if (acc.elegivelCotaOP) {
      qtdUnidadesElegiveis += 1;
      totalCotasAlocadas += acc.cotaOP;
    }

    totalDemandadoPcaOP += demandadoPcaOP;
    totalDemandadoForaPcaOP += demandadoForaPcaOP;

    const dfds = [...acc.dfdsMapa.values()].sort((a, b) => b.valorTotalOp - a.valorTotalOp);

    linhas.push({
      unidadeId: acc.unidadeId,
      unidadeNome: acc.unidadeNome,
      elegivelCotaOP: acc.elegivelCotaOP,
      cotaOP: acc.cotaOP,
      demandadoPcaOP,
      demandadoForaPcaOP,
      totalDemandadoOP,
      saldoDisponivel,
      percentualUtilizado,
      status,
      dfds,
    });
  }

  const pesoStatus: Record<StatusAuditoriaOP, number> = {
    NAO_ELEGIVEL_COM_OP: 0,
    EXTRAPOLOU: 1,
    LIMITE_EXATO: 2,
    DENTRO_LIMITE: 3,
  };

  linhas.sort((a, b) => {
    const pDiff = pesoStatus[a.status] - pesoStatus[b.status];
    if (pDiff !== 0) return pDiff;
    if (a.status === "EXTRAPOLOU" || a.status === "NAO_ELEGIVEL_COM_OP") {
      return a.saldoDisponivel - b.saldoDisponivel; // maior extrapolação primeiro
    }
    if (b.cotaOP !== a.cotaOP) return b.cotaOP - a.cotaOP;
    return a.unidadeNome.localeCompare(b.unidadeNome, "pt-BR");
  });

  const teto = arredondarCentavos(Number(tetoGlobalCotaOP) || 0);
  const totalPca = arredondarCentavos(totalDemandadoPcaOP);
  const totalForaPca = arredondarCentavos(totalDemandadoForaPcaOP);
  const totalDemandadoOP = arredondarCentavos(totalPca + totalForaPca);
  const saldoGlobalOP = arredondarCentavos(teto - totalDemandadoOP);

  return {
    ano,
    tetoGlobalCotaOP: teto,
    totalCotasAlocadas: arredondarCentavos(totalCotasAlocadas),
    totalDemandadoPcaOP: totalPca,
    totalDemandadoForaPcaOP: totalForaPca,
    totalDemandadoOP,
    saldoGlobalOP,
    percentualPcaSobreTeto: teto > 0 ? Math.round((totalPca / teto) * 1000) / 10 : 0,
    percentualTotalSobreTeto: teto > 0 ? Math.round((totalDemandadoOP / teto) * 1000) / 10 : 0,
    qtdUnidadesElegiveis,
    qtdExtrapoladas,
    qtdNaoElegiveisComOP,
    linhas,
  };
}

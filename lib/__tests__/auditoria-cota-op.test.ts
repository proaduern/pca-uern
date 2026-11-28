import { describe, expect, it } from "vitest";
import { calcularAuditoriaCotaOP } from "../auditoria-cota-op";

describe("calcularAuditoriaCotaOP", () => {
  it("concilia OP no PCA e OP fora do PCA (Diárias) por unidade e globalmente", () => {
    const resumo = calcularAuditoriaCotaOP({
      ano: 2027,
      tetoGlobalCotaOP: 1000,
      unidades: [
        { id: "u1", nome: "Campus Pau dos Ferros", elegivelCotaOP: true, cotaOP: 600, ativa: true },
        { id: "u2", nome: "FASSO", elegivelCotaOP: true, cotaOP: 400, ativa: true },
        { id: "u3", nome: "PROAD", elegivelCotaOP: false, cotaOP: 0, ativa: true },
      ],
      itensOp: [
        {
          id: "i1",
          dfdId: "d1",
          dfdNumero: 1,
          dfdDescricaoSumaria: "Mobília",
          dfdStatus: "AGUARDANDO_APROVACAO",
          unidadeId: "u1",
          unidadeNome: "Campus Pau dos Ferros",
          categoriaNome: "Mobília",
          ignoraPCA: false,
          valorTotal: 450,
        },
        {
          id: "i2",
          dfdId: "d2",
          dfdNumero: 2,
          dfdDescricaoSumaria: "Diárias",
          dfdStatus: "APROVADO",
          unidadeId: "u1",
          unidadeNome: "Campus Pau dos Ferros",
          categoriaNome: "Diárias",
          ignoraPCA: true,
          valorTotal: 100,
        },
        {
          id: "i3",
          dfdId: "d3",
          dfdNumero: 1,
          dfdDescricaoSumaria: "Equipamentos",
          dfdStatus: "APROVADO",
          unidadeId: "u2",
          unidadeNome: "FASSO",
          categoriaNome: "Informática",
          ignoraPCA: false,
          valorTotal: 400,
        },
      ],
    });

    expect(resumo.tetoGlobalCotaOP).toBe(1000);
    expect(resumo.totalCotasAlocadas).toBe(1000);
    expect(resumo.totalDemandadoPcaOP).toBe(850);
    expect(resumo.totalDemandadoForaPcaOP).toBe(100);
    expect(resumo.totalDemandadoOP).toBe(950);
    expect(resumo.saldoGlobalOP).toBe(50);
    expect(resumo.percentualPcaSobreTeto).toBe(85);
    expect(resumo.percentualTotalSobreTeto).toBe(95);
    expect(resumo.qtdUnidadesElegiveis).toBe(2);
    expect(resumo.qtdExtrapoladas).toBe(0);
    expect(resumo.qtdNaoElegiveisComOP).toBe(0);
    expect(resumo.linhas).toHaveLength(2);

    const fasso = resumo.linhas.find((l) => l.unidadeId === "u2")!;
    expect(fasso.status).toBe("LIMITE_EXATO");
    expect(fasso.saldoDisponivel).toBe(0);

    const capf = resumo.linhas.find((l) => l.unidadeId === "u1")!;
    expect(capf.status).toBe("DENTRO_LIMITE");
    expect(capf.demandadoPcaOP).toBe(450);
    expect(capf.demandadoForaPcaOP).toBe(100);
    expect(capf.totalDemandadoOP).toBe(550);
    expect(capf.saldoDisponivel).toBe(50);
    expect(capf.dfds).toHaveLength(2);
  });

  it("sinaliza e prioriza unidades que extrapolaram e unidades não elegíveis com item OP", () => {
    const resumo = calcularAuditoriaCotaOP({
      ano: 2027,
      tetoGlobalCotaOP: 500,
      unidades: [
        { id: "u1", nome: "FAEN", elegivelCotaOP: true, cotaOP: 200, ativa: true },
        { id: "u2", nome: "FAD", elegivelCotaOP: true, cotaOP: 300, ativa: true },
        { id: "u3", nome: "SOBE", elegivelCotaOP: false, cotaOP: 0, ativa: true },
      ],
      itensOp: [
        {
          id: "i1",
          dfdId: "d1",
          dfdNumero: 1,
          dfdDescricaoSumaria: "Item FAEN",
          dfdStatus: "AGUARDANDO_APROVACAO",
          unidadeId: "u1",
          unidadeNome: "FAEN",
          categoriaNome: "Mobília",
          ignoraPCA: false,
          valorTotal: 200.31,
        },
        {
          id: "i2",
          dfdId: "d2",
          dfdNumero: 9,
          dfdDescricaoSumaria: "Obra SOBE",
          dfdStatus: "AGUARDANDO_APROVACAO",
          unidadeId: "u3",
          unidadeNome: "SOBE",
          categoriaNome: "Obra ou Reforma",
          ignoraPCA: false,
          valorTotal: 1500000,
        },
      ],
    });

    expect(resumo.qtdExtrapoladas).toBe(1);
    expect(resumo.qtdNaoElegiveisComOP).toBe(1);
    expect(resumo.linhas.map((l) => l.unidadeNome)).toEqual(["SOBE", "FAEN", "FAD"]);
    expect(resumo.linhas[0].status).toBe("NAO_ELEGIVEL_COM_OP");
    expect(resumo.linhas[1].status).toBe("EXTRAPOLOU");
    expect(resumo.linhas[1].saldoDisponivel).toBe(-0.31);
    expect(resumo.linhas[2].status).toBe("DENTRO_LIMITE");
    expect(resumo.linhas[2].totalDemandadoOP).toBe(0);
  });

  it("trata categorias com fluxoContinuo como fora do PCA mesmo se ignoraPCA for false", () => {
    const resumo = calcularAuditoriaCotaOP({
      ano: 2027,
      tetoGlobalCotaOP: 1000,
      unidades: [
        { id: "u1", nome: "FE", elegivelCotaOP: true, cotaOP: 500, ativa: true },
      ],
      itensOp: [
        {
          id: "i1",
          dfdId: "d1",
          dfdNumero: 5,
          dfdDescricaoSumaria: "Diárias FE",
          dfdStatus: "APROVADO",
          unidadeId: "u1",
          unidadeNome: "FE",
          categoriaNome: "Diárias",
          ignoraPCA: false,
          fluxoContinuo: true,
          valorTotal: 18224.23,
        },
      ],
    });

    expect(resumo.totalDemandadoPcaOP).toBe(0);
    expect(resumo.totalDemandadoForaPcaOP).toBe(18224.23);
    expect(resumo.totalDemandadoOP).toBe(18224.23);
  });
});

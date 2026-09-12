import { describe, expect, it } from "vitest";
import {
  calcularGastos,
  dfdComprometeOrcamento,
  janelaAberta,
  saldoPCA,
  saldoUnidadeGeral,
  saldoUnidadeOP,
} from "../cota";

describe("dfdComprometeOrcamento", () => {
  it("rascunho não compromete orçamento", () => {
    expect(dfdComprometeOrcamento("RASCUNHO")).toBe(false);
  });
  it("reprovado não compromete orçamento", () => {
    expect(dfdComprometeOrcamento("REPROVADO")).toBe(false);
  });
  it("aguardando aprovação já compromete orçamento (reserva antes da aprovação)", () => {
    expect(dfdComprometeOrcamento("AGUARDANDO_APROVACAO")).toBe(true);
  });
  it("aprovado compromete orçamento", () => {
    expect(dfdComprometeOrcamento("APROVADO")).toBe(true);
  });
});

describe("calcularGastos", () => {
  it("separa gastos por enquadramento e soma total sem o convênio", () => {
    const g = calcularGastos([
      { enquadramento: "OP", valorTotal: 100 },
      { enquadramento: "GERAL", valorTotal: 50 },
      { enquadramento: "CONVENIO", valorTotal: 9999 },
    ]);
    expect(g.op).toBe(100);
    expect(g.geral).toBe(50);
    expect(g.convenio).toBe(9999);
    expect(g.total).toBe(150);
  });

  it("lista vazia dá tudo zero", () => {
    const g = calcularGastos([]);
    expect(g).toEqual({ op: 0, geral: 0, convenio: 0, total: 0 });
  });
});

describe("saldoUnidadeOP / saldoUnidadeGeral / saldoPCA", () => {
  it("calcula saldo restante corretamente", () => {
    expect(saldoUnidadeOP(1000, 300)).toBe(700);
    expect(saldoUnidadeGeral(500, 500)).toBe(0);
    expect(saldoPCA(1_000_000, 250_000)).toBe(750_000);
  });
});

describe("janelaAberta", () => {
  const pcaBase = {
    concluido: false,
    aberturaExtraGeral: false,
    dataAbertura: new Date("2026-03-01"),
    dataFechamento: new Date("2026-03-31"),
  };

  it("sem PCA configurado, janela fechada", () => {
    expect(janelaAberta(null, false, new Date("2026-03-15"))).toBe(false);
  });

  it("PCA concluído bloqueia mesmo dentro da janela de datas", () => {
    expect(janelaAberta({ ...pcaBase, concluido: true }, false, new Date("2026-03-15"))).toBe(
      false,
    );
  });

  it("abertura extra geral libera mesmo fora da janela de datas", () => {
    expect(
      janelaAberta({ ...pcaBase, aberturaExtraGeral: true }, false, new Date("2026-06-01")),
    ).toBe(true);
  });

  it("exceção individual libera mesmo fora da janela de datas", () => {
    expect(janelaAberta(pcaBase, true, new Date("2026-06-01"))).toBe(true);
  });

  it("dentro do intervalo de datas, sem exceção, está aberta", () => {
    expect(janelaAberta(pcaBase, false, new Date("2026-03-15"))).toBe(true);
  });

  it("fora do intervalo de datas, sem exceção, está fechada", () => {
    expect(janelaAberta(pcaBase, false, new Date("2026-04-01"))).toBe(false);
  });

  it("limites do intervalo (primeiro e último dia) são inclusivos", () => {
    expect(janelaAberta(pcaBase, false, new Date("2026-03-01"))).toBe(true);
    expect(janelaAberta(pcaBase, false, new Date("2026-03-31"))).toBe(true);
  });
});

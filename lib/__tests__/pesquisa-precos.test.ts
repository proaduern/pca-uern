import { describe, expect, it } from "vitest";
import { totalPesquisaPrecos, validarPesquisaPrecosParaFinalizar, type DadosPesquisaPrecoItem } from "../pesquisa-precos";

function itemCompleto(): DadosPesquisaPrecoItem {
  return {
    item: "Ar-condicionado Split 12000 BTUs",
    quantidade: 3,
    valorUnitarioPesquisado: 2500,
    medianaPesquisada: 2400,
    fontesConsultadas: "Painel de Preços (id 123), cotação com fornecedor X",
  };
}

describe("validarPesquisaPrecosParaFinalizar", () => {
  it("rejeita lista vazia", () => {
    expect(validarPesquisaPrecosParaFinalizar([], "Metodologia", "Fulano", "12345-6")).not.toBeNull();
  });

  it("aceita quando todos os itens, a metodologia e o responsável estão preenchidos", () => {
    expect(validarPesquisaPrecosParaFinalizar([itemCompleto()], "Metodologia da pesquisa.", "Fulano", "12345-6")).toBeNull();
  });

  it("rejeita item sem valor pesquisado", () => {
    const itens = [{ ...itemCompleto(), valorUnitarioPesquisado: 0 }];
    const erro = validarPesquisaPrecosParaFinalizar(itens, "Metodologia", "Fulano", "12345-6");
    expect(erro).toContain("nº 1");
  });

  it("rejeita item sem fontes consultadas", () => {
    const itens = [{ ...itemCompleto(), fontesConsultadas: "" }];
    const erro = validarPesquisaPrecosParaFinalizar(itens, "Metodologia", "Fulano", "12345-6");
    expect(erro).toContain("fontes consultadas");
  });

  it("rejeita sem metodologia", () => {
    expect(validarPesquisaPrecosParaFinalizar([itemCompleto()], "", "Fulano", "12345-6")).not.toBeNull();
  });

  it("rejeita sem responsável", () => {
    expect(validarPesquisaPrecosParaFinalizar([itemCompleto()], "Metodologia", "", "")).not.toBeNull();
  });
});

describe("totalPesquisaPrecos", () => {
  it("soma quantidade x valor unitário de todos os itens", () => {
    const itens = [itemCompleto(), { ...itemCompleto(), quantidade: 2, valorUnitarioPesquisado: 100 }];
    expect(totalPesquisaPrecos(itens)).toBe(3 * 2500 + 2 * 100);
  });

  it("retorna 0 para lista vazia", () => {
    expect(totalPesquisaPrecos([])).toBe(0);
  });
});

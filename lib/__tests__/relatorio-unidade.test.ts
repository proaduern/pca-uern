import { describe, expect, it } from "vitest";
import { computarPorCategoria, totalDosItens } from "../relatorio-unidade";

describe("totalDosItens", () => {
  it("soma o valor total de uma lista de itens", () => {
    expect(totalDosItens([{ valorTotal: 100 }, { valorTotal: 50.5 }])).toBe(150.5);
  });

  it("lista vazia dá zero", () => {
    expect(totalDosItens([])).toBe(0);
  });
});

describe("computarPorCategoria", () => {
  it("soma os valores por categoria e ordena do maior para o menor", () => {
    const resultado = computarPorCategoria([
      { categoriaNome: "Material de Expediente", valorTotal: 100 },
      { categoriaNome: "Livros", valorTotal: 500 },
      { categoriaNome: "Material de Expediente", valorTotal: 50 },
    ]);
    expect(resultado).toEqual([
      { categoria: "Livros", total: 500 },
      { categoria: "Material de Expediente", total: 150 },
    ]);
  });

  it("lista vazia dá lista vazia", () => {
    expect(computarPorCategoria([])).toEqual([]);
  });
});

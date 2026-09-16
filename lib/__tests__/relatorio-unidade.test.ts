import { describe, expect, it } from "vitest";
import { agruparPorCategoria, computarPorCategoria, totalDosItens } from "../relatorio-unidade";

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

describe("agruparPorCategoria", () => {
  it("agrupa itens por categoria em ordem alfabética, com subtotal por grupo", () => {
    const resultado = agruparPorCategoria([
      { categoriaNome: "Material de Expediente", nome: "Caneta", quantidade: 2, valorUnit: 5, valorTotal: 10 },
      { categoriaNome: "Livros", nome: "Livro A", quantidade: 1, valorUnit: 100, valorTotal: 100 },
      { categoriaNome: "Material de Expediente", nome: "Papel", quantidade: 1, valorUnit: 40, valorTotal: 40 },
    ]);
    expect(resultado).toHaveLength(2);
    expect(resultado[0].categoriaNome).toBe("Livros");
    expect(resultado[0].subtotal).toBe(100);
    expect(resultado[0].itens).toHaveLength(1);
    expect(resultado[1].categoriaNome).toBe("Material de Expediente");
    expect(resultado[1].subtotal).toBe(50);
    expect(resultado[1].itens).toHaveLength(2);
  });

  it("lista vazia dá lista vazia", () => {
    expect(agruparPorCategoria([])).toEqual([]);
  });
});

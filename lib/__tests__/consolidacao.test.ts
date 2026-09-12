import { describe, expect, it } from "vitest";
import { agruparPorCategoriaEItem, normalizarChave } from "../consolidacao";

describe("normalizarChave", () => {
  it("ignora maiúsculas/minúsculas e espaços extras", () => {
    expect(normalizarChave("Cadeira Ergonômica")).toBe(normalizarChave("cadeira   ergonômica"));
    expect(normalizarChave("  Cadeira  ")).toBe("cadeira");
  });
});

describe("agruparPorCategoriaEItem", () => {
  it("soma quantidade e valor de itens iguais em unidades diferentes, independente do enquadramento", () => {
    const grupos = agruparPorCategoriaEItem([
      { id: "1", categoriaId: "cat-1", nome: "Cadeira ergonômica", quantidade: 10, valorTotal: 5000 },
      { id: "2", categoriaId: "cat-1", nome: "Cadeira ergonômica", quantidade: 10, valorTotal: 5000 },
      { id: "3", categoriaId: "cat-1", nome: "cadeira ergonômica", quantidade: 10, valorTotal: 5000 },
    ]);

    expect(grupos).toHaveLength(1);
    expect(grupos[0].quantidadeTotal).toBe(30);
    expect(grupos[0].valorTotal).toBe(15000);
    expect(grupos[0].itemDfdIds).toEqual(["1", "2", "3"]);
  });

  it("não mistura itens de categorias diferentes mesmo com nome igual", () => {
    const grupos = agruparPorCategoriaEItem([
      { id: "1", categoriaId: "cat-1", nome: "Papel A4", quantidade: 5, valorTotal: 100 },
      { id: "2", categoriaId: "cat-2", nome: "Papel A4", quantidade: 5, valorTotal: 100 },
    ]);

    expect(grupos).toHaveLength(2);
  });

  it("mantém itens com nomes diferentes em grupos separados", () => {
    const grupos = agruparPorCategoriaEItem([
      { id: "1", categoriaId: "cat-1", nome: "Cadeira", quantidade: 1, valorTotal: 500 },
      { id: "2", categoriaId: "cat-1", nome: "Mesa", quantidade: 1, valorTotal: 800 },
    ]);

    expect(grupos).toHaveLength(2);
  });

  it("retorna lista vazia para entrada vazia", () => {
    expect(agruparPorCategoriaEItem([])).toEqual([]);
  });
});

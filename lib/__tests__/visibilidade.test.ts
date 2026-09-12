import { describe, expect, it } from "vitest";
import { categoriaVisivelPara, itemCatalogoVisivelPara, visivelPara } from "../visibilidade";

describe("visivelPara", () => {
  it("TODAS é sempre visível", () => {
    expect(visivelPara("TODAS", [], "u1")).toBe(true);
    expect(visivelPara("TODAS", ["u2"], "u1")).toBe(true);
  });

  it("SOMENTE só é visível para quem está na lista", () => {
    expect(visivelPara("SOMENTE", ["u1"], "u1")).toBe(true);
    expect(visivelPara("SOMENTE", ["u2"], "u1")).toBe(false);
    expect(visivelPara("SOMENTE", [], "u1")).toBe(false);
  });

  it("EXCETO é visível para todos, menos quem está na lista", () => {
    expect(visivelPara("EXCETO", ["u1"], "u1")).toBe(false);
    expect(visivelPara("EXCETO", ["u2"], "u1")).toBe(true);
    expect(visivelPara("EXCETO", [], "u1")).toBe(true);
  });
});

describe("categoriaVisivelPara", () => {
  it("usa o modo e a lista de unidades da própria categoria", () => {
    const categoria = { restricaoModo: "SOMENTE" as const, unidadesRestritas: [{ id: "u1" }] };
    expect(categoriaVisivelPara(categoria, "u1")).toBe(true);
    expect(categoriaVisivelPara(categoria, "u2")).toBe(false);
  });
});

describe("itemCatalogoVisivelPara", () => {
  const categoriaSomenteU1 = {
    restricaoModo: "SOMENTE" as const,
    unidadesRestritas: [{ id: "u1" }],
  };

  it("herda a regra da categoria quando o item não tem override (restricaoModo null)", () => {
    const item = { restricaoModo: null, unidadesRestritas: [] };
    expect(itemCatalogoVisivelPara(item, categoriaSomenteU1, "u1")).toBe(true);
    expect(itemCatalogoVisivelPara(item, categoriaSomenteU1, "u2")).toBe(false);
  });

  it("sobrescreve a regra da categoria quando o item tem sua própria regra", () => {
    const item = { restricaoModo: "TODAS" as const, unidadesRestritas: [] };
    expect(itemCatalogoVisivelPara(item, categoriaSomenteU1, "u2")).toBe(true);
  });

  it("override EXCETO do item ignora a lista da categoria", () => {
    const item = { restricaoModo: "EXCETO" as const, unidadesRestritas: [{ id: "u9" }] };
    expect(itemCatalogoVisivelPara(item, categoriaSomenteU1, "u1")).toBe(true);
    expect(itemCatalogoVisivelPara(item, categoriaSomenteU1, "u9")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { diasEntre, validarDataConclusao } from "../consolidacao";

describe("diasEntre", () => {
  it("calcula a diferença em dias corridos", () => {
    expect(diasEntre("2026-01-01", "2026-03-02")).toBe(60);
  });
});

describe("validarDataConclusao", () => {
  it("rejeita conclusão com menos de 60 dias após o ETP", () => {
    const erro = validarDataConclusao("2026-01-01", "2026-02-01");
    expect(erro).toContain("60 dias");
  });

  it("aceita conclusão exatamente 60 dias após o ETP", () => {
    expect(validarDataConclusao("2026-01-01", "2026-03-02")).toBeNull();
  });

  it("aceita conclusão bem depois do ETP", () => {
    expect(validarDataConclusao("2026-01-01", "2026-06-01")).toBeNull();
  });
});

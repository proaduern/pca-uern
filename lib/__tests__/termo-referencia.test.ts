import { describe, expect, it } from "vitest";
import { SECOES_TR, validarTermoReferenciaParaFinalizar, type DadosTermoReferencia } from "../termo-referencia";

function trCompleto(): DadosTermoReferencia {
  const tr: Partial<DadosTermoReferencia> = {};
  for (const secao of SECOES_TR) {
    (tr as Record<string, string>)[secao.campo] = "Texto preenchido para a seção.";
  }
  return tr as DadosTermoReferencia;
}

describe("validarTermoReferenciaParaFinalizar", () => {
  it("aceita TR com todas as seções e responsável preenchidos", () => {
    expect(validarTermoReferenciaParaFinalizar(trCompleto(), "Fulano de Tal", "12345-6")).toBeNull();
  });

  it("rejeita quando falta alguma seção", () => {
    const tr = trCompleto();
    tr.modeloExecucaoObjeto = "";
    const erro = validarTermoReferenciaParaFinalizar(tr, "Fulano", "12345-6");
    expect(erro).toContain("Modelo de Execução do Objeto");
  });

  it("rejeita sem nome do responsável", () => {
    expect(validarTermoReferenciaParaFinalizar(trCompleto(), "", "12345-6")).not.toBeNull();
  });

  it("rejeita sem matrícula do responsável", () => {
    expect(validarTermoReferenciaParaFinalizar(trCompleto(), "Fulano", "")).not.toBeNull();
  });
});

describe("SECOES_TR", () => {
  it("tem 8 seções, numeradas continuando a partir do ETP (15 a 22)", () => {
    expect(SECOES_TR).toHaveLength(8);
    expect(SECOES_TR[0].numero).toBe("15");
    expect(SECOES_TR[SECOES_TR.length - 1].numero).toBe("22");
  });
});

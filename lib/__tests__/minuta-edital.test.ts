import { describe, expect, it } from "vitest";
import { SECOES_MINUTA, validarMinutaEditalParaFinalizar, type DadosMinutaEdital } from "../minuta-edital";

function minutaCompleta(): DadosMinutaEdital {
  const minuta: Partial<DadosMinutaEdital> = {};
  for (const secao of SECOES_MINUTA) {
    (minuta as Record<string, string>)[secao.campo] = "Texto preenchido para a seção.";
  }
  return minuta as DadosMinutaEdital;
}

describe("validarMinutaEditalParaFinalizar", () => {
  it("aceita minuta com todas as seções e responsável preenchidos", () => {
    expect(validarMinutaEditalParaFinalizar(minutaCompleta(), "Fulano de Tal", "12345-6")).toBeNull();
  });

  it("rejeita quando falta alguma seção", () => {
    const minuta = minutaCompleta();
    minuta.julgamentoPropostas = "";
    const erro = validarMinutaEditalParaFinalizar(minuta, "Fulano", "12345-6");
    expect(erro).toContain("Do Julgamento das Propostas");
  });

  it("rejeita sem nome do responsável", () => {
    expect(validarMinutaEditalParaFinalizar(minutaCompleta(), "", "12345-6")).not.toBeNull();
  });

  it("rejeita sem matrícula do responsável", () => {
    expect(validarMinutaEditalParaFinalizar(minutaCompleta(), "Fulano", "")).not.toBeNull();
  });
});

describe("SECOES_MINUTA", () => {
  it("tem 8 seções, numeradas continuando a partir do TR (23 a 30)", () => {
    expect(SECOES_MINUTA).toHaveLength(8);
    expect(SECOES_MINUTA[0].numero).toBe("23");
    expect(SECOES_MINUTA[SECOES_MINUTA.length - 1].numero).toBe("30");
  });
});

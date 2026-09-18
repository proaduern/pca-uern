import { describe, expect, it } from "vitest";
import { SECOES_ETP, validarEtpParaFinalizar, validarRiscosParaFinalizar, type DadosEtp, type DadosRiscoItem } from "../etp-riscos";
import { RISCOS_PADRAO } from "../riscos-padrao";

function etpCompleto(): DadosEtp {
  const etp: Partial<DadosEtp> = { objeto: "Objeto de teste", localEntregaPrestacao: "Mossoró" };
  for (const secao of SECOES_ETP) {
    (etp as Record<string, string>)[secao.campo] = "Texto preenchido para a seção.";
  }
  return etp as DadosEtp;
}

describe("validarEtpParaFinalizar", () => {
  it("aceita ETP com todas as seções e responsável preenchidos", () => {
    expect(validarEtpParaFinalizar(etpCompleto(), "Fulano de Tal", "12345-6")).toBeNull();
  });

  it("rejeita quando falta alguma seção", () => {
    const etp = etpCompleto();
    etp.necessidadeContratacao = "";
    const erro = validarEtpParaFinalizar(etp, "Fulano", "12345-6");
    expect(erro).toContain("Necessidade da Contratação");
  });

  it("rejeita sem nome do responsável", () => {
    expect(validarEtpParaFinalizar(etpCompleto(), "", "12345-6")).not.toBeNull();
  });

  it("rejeita sem matrícula do responsável", () => {
    expect(validarEtpParaFinalizar(etpCompleto(), "Fulano", "")).not.toBeNull();
  });
});

function riscoCompleto(): DadosRiscoItem {
  return {
    fase: "PLANEJAMENTO",
    descricao: "Descrição",
    danos: "Danos",
    probabilidade: "BAIXA",
    impacto: "ALTO",
    nivelAceitacao: "ACEITACAO_INTERMEDIARIA",
    acoesPreventivas: "Ações preventivas",
    acoesContingenciais: "Ações contingenciais",
    responsavel: "Setor Demandante",
  };
}

describe("validarRiscosParaFinalizar", () => {
  it("rejeita lista vazia", () => {
    expect(validarRiscosParaFinalizar([], "Fulano", "12345-6")).not.toBeNull();
  });

  it("aceita quando todos os riscos e o responsável estão preenchidos", () => {
    expect(validarRiscosParaFinalizar([riscoCompleto()], "Fulano", "12345-6")).toBeNull();
  });

  it("rejeita quando algum campo de algum risco está vazio", () => {
    const itens = [riscoCompleto(), { ...riscoCompleto(), danos: "" }];
    const erro = validarRiscosParaFinalizar(itens, "Fulano", "12345-6");
    expect(erro).toContain("nº 2");
  });

  it("rejeita sem responsável", () => {
    expect(validarRiscosParaFinalizar([riscoCompleto()], "", "")).not.toBeNull();
  });
});

describe("RISCOS_PADRAO", () => {
  it("tem 16 riscos-modelo, todos válidos", () => {
    expect(RISCOS_PADRAO).toHaveLength(16);
    expect(validarRiscosParaFinalizar(RISCOS_PADRAO, "Fulano", "12345-6")).toBeNull();
  });
});

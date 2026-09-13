import { describe, expect, it } from "vitest";
import {
  calcularAtrasoExecucao,
  proximosStatusExecucao,
  statusExecucaoLabel,
  subperfilEfetivoCategoria,
  subperfilPadraoCategoria,
} from "../execucao";

describe("subperfilPadraoCategoria", () => {
  it("Obra ou Serviço de Engenharia vai para Obras", () => {
    expect(subperfilPadraoCategoria("Obra ou Serviço de Engenharia")).toBe("OBRAS");
  });

  it("categorias de serviço da lista fixa vão para Serviços", () => {
    expect(subperfilPadraoCategoria("Capacitações")).toBe("SERVICOS");
    expect(subperfilPadraoCategoria("Serviço comum sem mão de obra exclusiva")).toBe("SERVICOS");
  });

  it("qualquer outra categoria (materiais) vai para Materiais e Patrimônio", () => {
    expect(subperfilPadraoCategoria("Material de Expediente")).toBe("MATERIAIS_PATRIMONIO");
  });
});

describe("subperfilEfetivoCategoria", () => {
  it("sem override, usa o padrão", () => {
    expect(subperfilEfetivoCategoria("Capacitações", null)).toBe("SERVICOS");
  });

  it("com override, o override vence", () => {
    expect(subperfilEfetivoCategoria("Capacitações", "OBRAS")).toBe("OBRAS");
  });
});

describe("proximosStatusExecucao", () => {
  it("sem status atual (processo recém-aberto), só permite remetido ao fornecedor", () => {
    expect(proximosStatusExecucao(null).map((s) => s.value)).toEqual(["REMETIDO_FORNECEDOR"]);
  });

  it("remetido_fornecedor pode ir para rejeitada ou recebida em conferência", () => {
    expect(proximosStatusExecucao("REMETIDO_FORNECEDOR").map((s) => s.value)).toEqual([
      "REJEITADA_FORNECEDOR",
      "RECEBIDA_CONFERENCIA",
    ]);
  });

  it("recebida_definitivo e rejeitada_fornecedor são terminais", () => {
    expect(proximosStatusExecucao("RECEBIDA_DEFINITIVO")).toEqual([]);
    expect(proximosStatusExecucao("REJEITADA_FORNECEDOR")).toEqual([]);
  });
});

describe("statusExecucaoLabel", () => {
  it("null vira o pseudo-status de processo aberto", () => {
    expect(statusExecucaoLabel(null)).toBe("Processo de Execução Aberto");
  });
});

describe("calcularAtrasoExecucao", () => {
  it("não está em atraso se o status atual não for remetido_fornecedor", () => {
    expect(calcularAtrasoExecucao("RECEBIDA_DEFINITIVO", new Date("2020-01-01"), 5)).toBe(false);
  });

  it("está em atraso quando a data de envio + prazo já passou", () => {
    expect(calcularAtrasoExecucao("REMETIDO_FORNECEDOR", new Date("2020-01-01"), 5)).toBe(true);
  });

  it("não está em atraso quando a data de envio + prazo ainda não passou", () => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    expect(calcularAtrasoExecucao("REMETIDO_FORNECEDOR", amanha, 5)).toBe(false);
  });
});

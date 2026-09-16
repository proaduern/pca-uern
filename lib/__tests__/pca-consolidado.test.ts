import { describe, expect, it } from "vitest";
import {
  montarLinhaConsolidado,
  todasComCodigoPncp,
  totaisConsolidado,
  type ConsolidacaoParaLinha,
} from "../pca-consolidado";

function consolidacao(overrides: Partial<ConsolidacaoParaLinha> = {}): ConsolidacaoParaLinha {
  return {
    categoriaNome: "Material de Expediente",
    classificacaoRubrica: "3.3.9.0.30 Material de Consumo",
    codigoPncp: null,
    itensDfd: [],
    valorItensTecnicos: 0,
    ...overrides,
  };
}

describe("montarLinhaConsolidado", () => {
  it("separa os valores por enquadramento (convênio / recursos extra / fonte 500)", () => {
    const linha = montarLinhaConsolidado(
      consolidacao({
        itensDfd: [
          { enquadramento: "GERAL", valorTotal: 100, tipoDemanda: "NOVA" },
          { enquadramento: "OP", valorTotal: 50, tipoDemanda: "NOVA" },
          { enquadramento: "CONVENIO", valorTotal: 200, tipoDemanda: "NOVA" },
          { enquadramento: "RECURSOS_EXTRA", valorTotal: 30, tipoDemanda: "NOVA" },
        ],
      }),
    );
    expect(linha.fonte500).toBe(150);
    expect(linha.convenio).toBe(200);
    expect(linha.recursosExtra).toBe(30);
    expect(linha.total).toBe(380);
  });

  it("itens técnicos (sem enquadramento próprio) contam como Fonte 500", () => {
    const linha = montarLinhaConsolidado(consolidacao({ valorItensTecnicos: 400 }));
    expect(linha.fonte500).toBe(400);
    expect(linha.total).toBe(400);
  });

  it("usa '—' quando não há classificação/rubrica cadastrada", () => {
    const linha = montarLinhaConsolidado(consolidacao({ classificacaoRubrica: null }));
    expect(linha.classificacaoRubrica).toBe("—");
  });

  it("modalidade única quando todos os itens do DFD concordam", () => {
    const linha = montarLinhaConsolidado(
      consolidacao({
        itensDfd: [
          { enquadramento: "GERAL", valorTotal: 100, tipoDemanda: "RENOVACAO" },
          { enquadramento: "GERAL", valorTotal: 50, tipoDemanda: "RENOVACAO" },
        ],
      }),
    );
    expect(linha.modalidade).toBe("Renovação Contratual");
  });

  it("modalidade 'Diversos' quando a consolidação mistura tipos de demanda", () => {
    const linha = montarLinhaConsolidado(
      consolidacao({
        itensDfd: [
          { enquadramento: "GERAL", valorTotal: 100, tipoDemanda: "RENOVACAO" },
          { enquadramento: "GERAL", valorTotal: 50, tipoDemanda: "NOVA" },
        ],
      }),
    );
    expect(linha.modalidade).toBe("Diversos");
  });

  it("modalidade '—' quando não há item de DFD (só técnico)", () => {
    const linha = montarLinhaConsolidado(consolidacao({ valorItensTecnicos: 100 }));
    expect(linha.modalidade).toBe("—");
  });
});

describe("totaisConsolidado", () => {
  it("soma os totais de todas as linhas", () => {
    const linhas = [
      montarLinhaConsolidado(consolidacao({ itensDfd: [{ enquadramento: "GERAL", valorTotal: 100, tipoDemanda: "NOVA" }] })),
      montarLinhaConsolidado(consolidacao({ itensDfd: [{ enquadramento: "CONVENIO", valorTotal: 50, tipoDemanda: "NOVA" }] })),
    ];
    const totais = totaisConsolidado(linhas);
    expect(totais.fonte500).toBe(100);
    expect(totais.convenio).toBe(50);
    expect(totais.total).toBe(150);
  });
});

describe("todasComCodigoPncp", () => {
  it("true quando todas as linhas têm código PNCP", () => {
    const linhas = [
      montarLinhaConsolidado(consolidacao({ codigoPncp: "ABC123" })),
      montarLinhaConsolidado(consolidacao({ codigoPncp: "DEF456" })),
    ];
    expect(todasComCodigoPncp(linhas)).toBe(true);
  });

  it("false quando alguma linha está sem código PNCP", () => {
    const linhas = [
      montarLinhaConsolidado(consolidacao({ codigoPncp: "ABC123" })),
      montarLinhaConsolidado(consolidacao({ codigoPncp: null })),
    ];
    expect(todasComCodigoPncp(linhas)).toBe(false);
  });

  it("true (vacuamente) para lista vazia", () => {
    expect(todasComCodigoPncp([])).toBe(true);
  });
});
